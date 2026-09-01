import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { MovementType, PurchaseStatus } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';
import { AppError, ErrorCodes } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';

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
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'At least one purchase item is required', 400);
  }

  let purchaseResult = await prisma.$transaction(async (tx) => {
    // 1. Validate Supplier if provided
    if (params.supplierId) {
      const supplier = await tx.supplier.findUnique({
        where: { id: params.supplierId, businessId: params.businessId },
      });
      if (!supplier) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Supplier not found or does not belong to this business', 404);
      }
      if (!supplier.isActive) {
        throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Cannot create purchase for an archived supplier');
      }
    }

    // 2. Validate Branch if provided
    if (params.branchId) {
      const branch = await tx.branch.findUnique({
        where: { id: params.branchId, businessId: params.businessId },
      });
      if (!branch) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Branch not found or does not belong to this business', 404);
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

    // Authoritative stock levels captured from the atomic UPDATE below, so the
    // StockMovement ledger reflects real committed values rather than a stale
    // pre-read (prevents lost updates under concurrent mutations).
    const stockLedger: Array<{ productId: string; quantity: number; previousStock: number; resultingStock: number }> = [];

    for (const item of params.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId, businessId: params.businessId },
      });

      if (!product) {
        throw new AppError(ErrorCodes.NOT_FOUND, `Product ${item.productId} not found`, 404);
      }
      if (!product.isActive) {
        throw new AppError(ErrorCodes.INTERNAL_ERROR, `Cannot purchase archived product: ${product.name}`);
      }
      if (item.quantity <= 0) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, `Quantity for product ${product.name} must be greater than 0`, 400);
      }
      if (item.purchasePrice < 0) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, `Purchase price for product ${product.name} cannot be negative`, 400);
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

      // Atomic relative increment + catalog cost update. This row-locks the
      // product and returns the committed resulting stock, so concurrent
      // purchases/sales/adjustments can never overwrite each other.
      const updatedRows: Array<{ currentStock: number }> = await tx.$queryRaw`
        UPDATE "public"."Product"
        SET "currentStock" = "currentStock" + ${item.quantity}::integer,
            "purchasePrice" = ${item.purchasePrice}::numeric(12, 2),
            "updatedAt" = NOW()
        WHERE "id" = ${item.productId}::text
          AND "businessId" = ${params.businessId}::text
          AND "isActive" = true
        RETURNING "currentStock";
      `;

      if (!updatedRows || updatedRows.length === 0) {
        throw new AppError(ErrorCodes.NOT_FOUND, `Product ${item.productId} not found`, 404);
      }

      const resultingStock = Number(updatedRows[0].currentStock);
      
      const existingLedger = stockLedger.find(l => l.productId === item.productId);
      if (existingLedger) {
        existingLedger.quantity += item.quantity;
        existingLedger.resultingStock = resultingStock;
      } else {
        stockLedger.push({
          productId: item.productId,
          quantity: item.quantity,
          previousStock: resultingStock - item.quantity,
          resultingStock,
        });
      }
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
    for (const entry of stockLedger) {
      await tx.stockMovement.create({
        data: {
          businessId: params.businessId,
          branchId: params.branchId,
          productId: entry.productId,
          movementType: MovementType.PURCHASE,
          quantity: entry.quantity,
          previousStock: entry.previousStock,
          resultingStock: entry.resultingStock,
          referenceId: purchase.id,
          notes: `Purchase Invoice #${purchase.invoiceNumber || purchase.id.slice(0, 8)}`,
          createdBy: params.userId,
        },
      });
    }

    logger.warn('Purchase created', { businessId: params.businessId, purchaseId: purchase.id, total, itemCount: purchase.items.length });

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

  try {
    invalidateAnalyticsCache({ businessId: params.businessId, branchId: params.branchId || undefined, module: 'purchases' });
    invalidateAnalyticsCache({ businessId: params.businessId, branchId: params.branchId || undefined, module: 'inventory' });
    publishAnalyticsEvent({ type: 'purchase', businessId: params.businessId, branchId: params.branchId || null, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the mutation
  }

  return purchaseResult;
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
  let result = await prisma.$transaction(async (tx) => {
    // 1. Fetch Purchase (for context / validation only — no state decisions here)
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId, businessId },
      include: { items: true, supplier: true },
    });

    if (!purchase) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Purchase not found', 404);
    }

    // Save branchId for cache invalidation after transaction
    const branchId = purchase.branchId;

    // 2. Atomic RECEIVED -> CANCELLED transition. updateMany row-locks the
    //    purchase for the duration of this transaction, so exactly one
    //    concurrent cancellation wins; the loser sees count === 0 and aborts
    //    without restoring stock or writing duplicate reversal movements.
    const transition = await tx.purchase.updateMany({
      where: { id: purchaseId, businessId, status: PurchaseStatus.RECEIVED },
      data: { status: PurchaseStatus.CANCELLED },
    });

    if (transition.count === 0) {
      throw new AppError(ErrorCodes.CONFLICT, 'Purchase is already cancelled.', 409);
    }

    // 3. Process Reversal for each item using atomic guarded decrements.
    //    Each decrement only applies if sufficient stock still exists; on
    //    failure the whole transaction rolls back and the purchase returns
    //    to RECEIVED (no partial state).
    for (const item of purchase.items) {
      const decremented: Array<{ currentStock: number }> = await tx.$queryRaw`
        UPDATE "public"."Product"
        SET "currentStock" = "currentStock" - ${item.quantity}::integer,
            "updatedAt" = NOW()
        WHERE "id" = ${item.productId}::text
          AND "businessId" = ${businessId}::text
          AND "currentStock" >= ${item.quantity}::integer
        RETURNING "currentStock";
      `;

      if (!decremented || decremented.length === 0) {
        const product = await tx.product.findUnique({
          where: { id: item.productId, businessId },
          select: { name: true },
        });
        throw new AppError(
          ErrorCodes.INSUFFICIENT_STOCK,
          `Purchase cannot be cancelled because the stock for "${product?.name || item.productId}" has already been consumed. Review the related inventory/sales transactions first.`,
          409
        );
      }

      const resultingStock = Number(decremented[0].currentStock);
      const previousStock = resultingStock + item.quantity;

      // MANDATORY: Cost-Price Recalculation. When the latest purchase is
      // cancelled, recalculate Product.purchasePrice from the latest remaining
      // valid (RECEIVED) purchase for that product.
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

      if (latestRemainingPurchaseItem) {
        await tx.product.update({
          where: { id: item.productId },
          data: { purchasePrice: Number(latestRemainingPurchaseItem.purchasePrice) },
        });
      }

      // Create Reversal Stock Movement Ledger (authoritative committed values)
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

    // 4. Append cancellation reason to notes (status already set atomically)
    const updatedPurchase = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
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

    return { purchase: updatedPurchase, branchId };
  });

  try {
    invalidateAnalyticsCache({ businessId, branchId: result.branchId || undefined, module: 'purchases' });
    invalidateAnalyticsCache({ businessId, branchId: result.branchId || undefined, module: 'inventory' });
    publishAnalyticsEvent({ type: 'purchase', businessId, branchId: result.branchId || null, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the mutation
  }

  return result.purchase;
}
