import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { MovementType, PurchaseStatus } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { AppErrors } from '@/lib/utils/api-response';

export type PurchaseItemInput = {
  productId: string;
  quantity: number;
  purchasePrice: number;
  discount?: number;
};

export type CreatePurchaseParams = {
  businessId: string;
  userId: string;
  branchId?: string | null;
  supplierId?: string | null;
  invoiceNumber?: string | null;
  purchaseDate?: Date | string;
  notes?: string | null;
  items: PurchaseItemInput[];
  discount?: number;
  paidAmount?: number;
};

export async function createPurchase(params: CreatePurchaseParams) {
  if (!params.items || params.items.length === 0) {
    throw new Error('At least one purchase item is required');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Validate Supplier if provided
    if (params.supplierId) {
      const supplier = await tx.supplier.findUnique({
        where: { id: params.supplierId, businessId: params.businessId },
      });
      if (!supplier) {
        throw new Error('Supplier not found or does not belong to this business');
      }
      if (!supplier.isActive) {
        throw new Error('Cannot create purchase for an archived supplier');
      }
    }

    // 2. Validate Branch if provided
    if (params.branchId) {
      const branch = await tx.branch.findUnique({
        where: { id: params.branchId, businessId: params.businessId },
      });
      if (!branch) {
        throw new Error('Branch not found or does not belong to this business');
      }
    }

    // 3. Validate Products and build Line Items
    let subtotal = 0;
    const purchaseItemsData: {
      productId: string;
      quantity: number;
      purchasePrice: number;
      discount: number;
      lineTotal: number;
    }[] = [];

    for (const item of params.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId, businessId: params.businessId },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not found in this business`);
      }
      if (!product.isActive) {
        throw new Error(`Cannot purchase archived product: ${product.name}`);
      }
      if (item.quantity <= 0) {
        throw new Error(`Quantity for product ${product.name} must be greater than 0`);
      }
      if (item.purchasePrice < 0) {
        throw new Error(`Purchase price for product ${product.name} cannot be negative`);
      }

      const itemDiscount = item.discount || 0;
      const lineTotal = Math.max(0, (item.purchasePrice * item.quantity) - itemDiscount);
      subtotal += lineTotal;

      purchaseItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        discount: itemDiscount,
        lineTotal,
      });

      // Update Product: increment stock and update catalog purchasePrice
      const previousStock = product.currentStock;
      const resultingStock = previousStock + item.quantity;

      await tx.product.update({
        where: { id: product.id },
        data: {
          currentStock: resultingStock,
          purchasePrice: item.purchasePrice,
        },
      });
    }

    const discount = params.discount || 0;
    const total = Math.max(0, subtotal - discount);
    const paidAmount = Math.max(0, params.paidAmount || 0);

    const purchaseDate = params.purchaseDate ? new Date(params.purchaseDate) : new Date();

    // 4. Create Purchase Record
    const purchase = await tx.purchase.create({
      data: {
        businessId: params.businessId,
        branchId: params.branchId,
        supplierId: params.supplierId,
        invoiceNumber: params.invoiceNumber || null,
        purchaseDate,
        subtotal,
        discount,
        total,
        paidAmount,
        status: PurchaseStatus.RECEIVED,
        notes: params.notes || null,
        createdBy: params.userId,
        items: {
          create: purchaseItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
      },
    });

    // 5. Create Stock Movement Ledger Records
    for (const item of purchase.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      await tx.stockMovement.create({
        data: {
          businessId: params.businessId,
          branchId: params.branchId,
          productId: item.productId,
          movementType: MovementType.PURCHASE,
          quantity: item.quantity,
          previousStock: product!.currentStock - item.quantity,
          resultingStock: product!.currentStock,
          referenceId: purchase.id,
          notes: `Purchase Invoice #${purchase.invoiceNumber || purchase.id.slice(0, 8)}`,
          createdBy: params.userId,
        },
      });
    }

    // 6. Record Audit Log
    await recordAuditLog({
      businessId: params.businessId,
      userId: params.userId,
      branchId: params.branchId || undefined,
      action: 'PURCHASE_CREATED',
      entityType: 'Purchase',
      entityId: purchase.id,
      metadata: {
        invoiceNumber: purchase.invoiceNumber,
        total,
        paidAmount,
        itemCount: purchase.items.length,
      },
    });

    return purchase;
  });
}

export async function getPurchaseById(businessId: string, purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId, businessId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              unit: true,
              currentStock: true,
            },
          },
        },
      },
      supplier: true,
      branch: true,
    },
  });

  return purchase;
}

export type ListPurchasesFilters = {
  search?: string;
  supplierId?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export async function listPurchases(businessId: string, filters: ListPurchasesFilters = {}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { businessId }; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (filters.search && filters.search.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (filters.supplierId && filters.supplierId !== 'ALL') {
    where.supplierId = filters.supplierId;
  }

  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status as PurchaseStatus;
  }

  if (filters.startDate || filters.endDate) {
    where.purchaseDate = {};
    if (filters.startDate) {
      where.purchaseDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.purchaseDate.lte = end;
    }
  }

  const [purchases, totalCount, aggregate] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
      },
      orderBy: [
        { purchaseDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    }),
    prisma.purchase.count({ where }),
    prisma.purchase.aggregate({
      where,
      _sum: {
        total: true,
        paidAmount: true,
      },
    }),
  ]);

  // Apply paymentStatus filter in memory if specified (since paymentStatus is computed from paidAmount & total)
  let filteredPurchases = purchases;
  if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
    filteredPurchases = purchases.filter((p) => {
      const total = Number(p.total);
      const paid = Number(p.paidAmount);
      if (filters.paymentStatus === 'PAID') return paid >= total && total > 0;
      if (filters.paymentStatus === 'PARTIAL') return paid > 0 && paid < total;
      if (filters.paymentStatus === 'UNPAID') return paid === 0 && total > 0;
      return true;
    });
  }

  const totalSpend = Number(aggregate._sum.total || 0);
  const totalPaid = Number(aggregate._sum.paidAmount || 0);
  const remainingDue = Math.max(0, totalSpend - totalPaid);

  return {
    purchases: filteredPurchases,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    summary: {
      totalSpend,
      totalPaid,
      remainingDue,
      invoiceCount: totalCount,
    },
  };
}

export async function cancelPurchase(
  businessId: string,
  userId: string,
  purchaseId: string,
  reason: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch Purchase
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId, businessId },
      include: { items: true, supplier: true },
    });

    if (!purchase) {
      throw new Error(AppErrors.NOT_FOUND);
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new Error('Purchase is already cancelled.');
    }

    // 2. MANDATORY CHECK 1: Stock Sufficiency Check
    // Calculate whether reversing its inventory impact would make product stock negative
    for (const item of purchase.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId, businessId },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.currentStock < item.quantity) {
        throw new Error(
          'Purchase cannot be cancelled because its stock has already been consumed. Review the related inventory/sales transactions first.'
        );
      }
    }

    // 3. Process Reversal for each item
    for (const item of purchase.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId, businessId },
      });

      const previousStock = product!.currentStock;
      const resultingStock = previousStock - item.quantity;

      // MANDATORY CHECK 2: Cost-Price Recalculation
      // When the latest purchase is cancelled, recalculate Product.purchasePrice
      // from the latest remaining valid (RECEIVED) purchase for that product.
      const latestRemainingPurchaseItem = await tx.purchaseItem.findFirst({
        where: {
          productId: item.productId,
          purchase: {
            businessId,
            status: PurchaseStatus.RECEIVED,
            id: { not: purchase.id },
          },
        },
        include: { purchase: true },
        orderBy: [
          { purchase: { purchaseDate: 'desc' } },
          { purchase: { createdAt: 'desc' } },
        ],
      });

      const updatedProductData: { currentStock: number; purchasePrice?: number } = {
        currentStock: resultingStock,
      };

      if (latestRemainingPurchaseItem) {
        updatedProductData.purchasePrice = Number(latestRemainingPurchaseItem.purchasePrice);
      }

      await tx.product.update({
        where: { id: item.productId },
        data: updatedProductData,
      });

      // Create Reversal Stock Movement Ledger
      await tx.stockMovement.create({
        data: {
          businessId,
          branchId: purchase.branchId,
          productId: item.productId,
          movementType: MovementType.RETURN,
          quantity: -item.quantity,
          previousStock,
          resultingStock,
          referenceId: purchase.id,
          notes: `Cancelled Purchase #${purchase.invoiceNumber || purchase.id.slice(0, 8)}: ${reason}`,
          createdBy: userId,
        },
      });
    }

    // 4. Update Purchase status
    const updatedPurchase = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: PurchaseStatus.CANCELLED,
        notes: purchase.notes
          ? `${purchase.notes}\n[CANCELLED]: ${reason}`
          : `[CANCELLED]: ${reason}`,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
      },
    });

    // 5. Record Audit Log
    await recordAuditLog({
      businessId,
      userId,
      branchId: purchase.branchId || undefined,
      action: 'PURCHASE_CANCELLED',
      entityType: 'Purchase',
      entityId: purchase.id,
      metadata: {
        reason,
        invoiceNumber: purchase.invoiceNumber,
        total: Number(purchase.total),
      },
    });

    return updatedPurchase;
  });
}
