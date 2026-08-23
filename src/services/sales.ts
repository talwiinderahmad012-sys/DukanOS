import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { PaymentMethod, MovementType, SaleStatus, BusinessStatus } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';
import { AppError, ErrorCodes } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';

export type SaleItemInput = {
  productId: string;
  quantity: number;
  sellingPrice?: number;
  discount?: number;
};

export type CreateSaleParams = {
  businessId: string;
  userId: string;
  branchId?: string | null;
  customerId?: string | null;
  items: SaleItemInput[];
  discount?: number;
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
  clientTransactionId?: string | null;
};

export async function createSale(params: CreateSaleParams) {
  if (!params.items || params.items.length === 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'At least one item is required to complete a sale.', 400);
  }

  let saleResult = await prisma.$transaction(async (tx) => {
    // 0. Validate Business status
    const business = await tx.business.findUnique({
      where: { id: params.businessId },
      select: { status: true },
    });
    if (!business || business.status === BusinessStatus.ARCHIVED || business.status === BusinessStatus.INACTIVE) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Cannot create sale for an ARCHIVED or inactive business.', 403);
    }

    // 0.1 Idempotency check for offline / retried transactions
    if (params.clientTransactionId) {
      const existingSale = await tx.sale.findFirst({
        where: {
          businessId: params.businessId,
          clientTransactionId: params.clientTransactionId,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          branch: true,
        },
      });
      if (existingSale) {
        logger.warn('Duplicate sale transaction detected', { businessId: params.businessId, clientTransactionId: params.clientTransactionId });
        return existingSale;
      }
    }

    // 1. Validate Customer if provided
    let customer = null;
    if (params.customerId) {
      customer = await tx.customer.findUnique({
        where: { id: params.customerId, businessId: params.businessId },
      });

      if (!customer) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Customer not found or does not belong to this business', 404);
      }
      if (!customer.isActive) {
        throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Cannot process credit sale for an archived customer');
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

    // 3. Concurrency-Safe Stock Decrement & Item Processing
    const processedItems: {
      productId: string;
      quantity: number;
      sellingPrice: number;
      costPrice: number;
      discount: number;
      baseLineTotal: number;
      previousStock: number;
      resultingStock: number;
    }[] = [];

    let rawSubtotal = 0;

    for (const item of params.items) {
      if (item.quantity <= 0) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Item quantity must be greater than 0', 400);
      }

      // Concurrency-Safe Atomic Conditional Decrement via PostgreSQL
      // Decrements stock ONLY IF currentStock >= requested quantity
      const rows: Array<{
        id: string;
        name: string;
        currentStock: number;
        purchasePrice: string | number;
        sellingPrice: string | number;
      }> = await tx.$queryRaw`
        UPDATE "public"."Product"
        SET "currentStock" = "currentStock" - ${item.quantity}::integer,
            "updatedAt" = NOW()
        WHERE "id" = ${item.productId}::text
          AND "businessId" = ${params.businessId}::text
          AND "isActive" = true
          AND "currentStock" >= ${item.quantity}::integer
        RETURNING "id", "name", "currentStock", "purchasePrice", "sellingPrice";
      `;

      if (!rows || rows.length === 0) {
        // Fetch product to give descriptive error
        const existing = await tx.product.findUnique({
          where: { id: item.productId, businessId: params.businessId },
        });

        if (!existing) {
          throw new AppError(ErrorCodes.NOT_FOUND, `Product ${item.productId} not found`, 404);
        }
        if (!existing.isActive) {
          throw new AppError(ErrorCodes.INTERNAL_ERROR, `Product ${existing.name} is archived and cannot be sold`);
        }
        logger.warn('Insufficient stock for sale', { businessId: params.businessId, productId: item.productId, requested: item.quantity });
        throw new AppError(ErrorCodes.INSUFFICIENT_STOCK, 'Insufficient stock', 409);
      }

      const product = rows[0];
      const resultingStock = product.currentStock;
      const previousStock = resultingStock + item.quantity;

      const sellingPrice =
        item.sellingPrice !== undefined && item.sellingPrice >= 0
          ? item.sellingPrice
          : Number(product.sellingPrice);

      const costPrice = Number(product.purchasePrice);
      const lineDiscount = item.discount || 0;
      const baseLineTotal = Math.max(0, sellingPrice * item.quantity - lineDiscount);

      rawSubtotal += baseLineTotal;

      processedItems.push({
        productId: product.id,
        quantity: item.quantity,
        sellingPrice,
        costPrice,
        discount: lineDiscount,
        baseLineTotal,
        previousStock,
        resultingStock,
      });
    }

    // 4. Proportional Global Discount Allocation & Realized Profit Calculation
    const globalDiscount = Math.min(params.discount || 0, rawSubtotal);
    const grandTotal = Math.max(0, rawSubtotal - globalDiscount);
    const paidAmount = Math.max(0, params.paidAmount || 0);

    // Rule: Credit / Partial sales strictly require an identified customer
    if (paidAmount < grandTotal && !params.customerId) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'An identified customer is required for credit / partial sales.', 400);
    }

    const saleItemsData = processedItems.map((item) => {
      // Proportionally allocate global discount to each line item
      const globalDiscountShare =
        rawSubtotal > 0 ? (item.baseLineTotal / rawSubtotal) * globalDiscount : 0;

      const totalEffectiveDiscount = item.discount + globalDiscountShare;
      const realizedRevenue = Math.max(
        0,
        item.sellingPrice * item.quantity - totalEffectiveDiscount
      );
      const lineProfit = realizedRevenue - item.costPrice * item.quantity;

      return {
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        costPrice: item.costPrice,
        discount: item.discount,
        lineTotal: item.baseLineTotal,
        lineProfit,
      };
    });

    // 5. Create Sale Record
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    const sale = await tx.sale.create({
      data: {
        businessId: params.businessId,
        branchId: params.branchId,
        customerId: params.customerId,
        invoiceNumber,
        subtotal: rawSubtotal,
        discount: globalDiscount,
        total: grandTotal,
        paidAmount,
        paymentMethod: params.paymentMethod || PaymentMethod.CASH,
        status: SaleStatus.COMPLETED,
        createdBy: params.userId,
        clientTransactionId: params.clientTransactionId || null,
        items: {
          create: saleItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    // 6. Record Stock Movements
    for (const item of processedItems) {
      await tx.stockMovement.create({
        data: {
          businessId: params.businessId,
          branchId: params.branchId,
          productId: item.productId,
          movementType: MovementType.SALE,
          quantity: -item.quantity,
          previousStock: item.previousStock,
          resultingStock: item.resultingStock,
          referenceId: sale.id,
          notes: `Sale Invoice #${invoiceNumber}`,
          createdBy: params.userId,
        },
      });
    }

    // 7. Customer Credit Semantics (Only for unpaid balance)
    if (params.customerId && paidAmount < grandTotal) {
      const unpaidCredit = grandTotal - paidAmount;
      await tx.customer.update({
        where: { id: params.customerId },
        data: {
          outstanding: { increment: unpaidCredit },
        },
      });
    }

    logger.warn('Sale created', { businessId: params.businessId, saleId: sale.id, invoiceNumber, total: grandTotal, itemCount: sale.items.length });

    // 8. Record Audit Log
    await recordAuditLog({
      businessId: params.businessId,
      userId: params.userId,
      branchId: params.branchId || undefined,
      action: 'SALE_CREATED',
      entityType: 'Sale',
      entityId: sale.id,
      metadata: {
        invoiceNumber,
        total: grandTotal,
        paidAmount,
        customerId: params.customerId,
        itemCount: sale.items.length,
      },
    });

    return sale;
  });

  try {
    invalidateAnalyticsCache({ businessId: params.businessId, branchId: params.branchId || undefined, module: 'sales' });
    invalidateAnalyticsCache({ businessId: params.businessId, branchId: params.branchId || undefined, module: 'customers' });
    invalidateAnalyticsCache({ businessId: params.businessId, branchId: params.branchId || undefined, module: 'inventory' });
    publishAnalyticsEvent({ type: 'sale', businessId: params.businessId, branchId: params.branchId || null, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the sale
  }

  return saleResult;
}

export async function getSaleById(businessId: string, saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId, businessId },
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
      customer: true,
      branch: true,
      business: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          currency: true,
        },
      },
    },
  });

  return sale;
}

export type ListSalesFilters = {
  search?: string;
  customerId?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export async function listSales(businessId: string, filters: ListSalesFilters = {}) {
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const skip = (page - 1) * limit;

  const where: any = { businessId }; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (filters.search && filters.search.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (filters.customerId && filters.customerId !== 'ALL') {
    where.customerId = filters.customerId;
  }

  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status as SaleStatus;
  }

  if (filters.startDate || filters.endDate) {
    where.saleDate = {};
    if (filters.startDate) {
      where.saleDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.saleDate.lte = end;
    }
  }

  const [sales, totalCount, aggregate, itemsAggregate] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: {
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
      orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where,
      _sum: {
        total: true,
        paidAmount: true,
      },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: where,
      },
      _sum: {
        lineProfit: true,
      },
    }),
  ]);

  let filteredSales = sales;
  if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
    filteredSales = sales.filter((s) => {
      const total = Number(s.total);
      const paid = Number(s.paidAmount);
      if (filters.paymentStatus === 'PAID') return paid >= total && total > 0;
      if (filters.paymentStatus === 'PARTIAL') return paid > 0 && paid < total;
      if (filters.paymentStatus === 'UNPAID') return paid === 0 && total > 0;
      return true;
    });
  }

  const totalRevenue = Number(aggregate._sum.total || 0);
  const totalPaid = Number(aggregate._sum.paidAmount || 0);
  const totalProfit = Number(itemsAggregate._sum.lineProfit || 0);
  const remainingDue = Math.max(0, totalRevenue - totalPaid);

  return {
    sales: filteredSales,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    summary: {
      totalRevenue,
      totalPaid,
      totalProfit,
      remainingDue,
      invoiceCount: totalCount,
    },
  };
}

export async function cancelSale(
  businessId: string,
  userId: string,
  saleId: string,
  reason: string
) {
  let cancelledSale = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId, businessId },
      include: { items: true, customer: true },
    });

    if (!sale) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Sale not found', 404);
    }

    if (sale.status === SaleStatus.CANCELLED) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Sale is already cancelled.');
    }

    // 1. Restore Product Stock & Create Reverse Stock Movement
    for (const item of sale.items) {
      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { increment: item.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          businessId,
          branchId: sale.branchId,
          productId: item.productId,
          movementType: MovementType.RETURN,
          quantity: item.quantity,
          previousStock: updatedProduct.currentStock - item.quantity,
          resultingStock: updatedProduct.currentStock,
          referenceId: sale.id,
          notes: `Cancelled Sale #${sale.invoiceNumber}: ${reason}`,
          createdBy: userId,
        },
      });
    }

    // 2. Reverse Customer Credit (if any credit was generated by this sale)
    const unpaidCredit = Number(sale.total) - Number(sale.paidAmount);
    if (unpaidCredit > 0 && sale.customerId) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: {
          outstanding: { decrement: unpaidCredit },
        },
      });
    }

    // 3. Mark Sale as CANCELLED (Preserving paid amount without fake phantom refund)
    const updatedSale = await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: SaleStatus.CANCELLED,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    // 4. Record Audit Log
    await recordAuditLog({
      businessId,
      userId,
      branchId: sale.branchId || undefined,
      action: 'SALE_CANCELLED',
      entityType: 'Sale',
      entityId: sale.id,
      metadata: {
        reason,
        invoiceNumber: sale.invoiceNumber,
        total: Number(sale.total),
        paidAmount: Number(sale.paidAmount),
        creditReversed: unpaidCredit > 0 ? unpaidCredit : 0,
      },
    });

    return updatedSale;
  });

  try {
    invalidateAnalyticsCache({ businessId, branchId: cancelledSale.branchId || undefined, module: 'sales' });
    invalidateAnalyticsCache({ businessId, branchId: cancelledSale.branchId || undefined, module: 'customers' });
    invalidateAnalyticsCache({ businessId, branchId: cancelledSale.branchId || undefined, module: 'inventory' });
    publishAnalyticsEvent({ type: 'sale', businessId, branchId: cancelledSale.branchId || null, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the mutation
  }

  return cancelledSale;
}
