import 'server-only';
import { randomInt } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { PaymentMethod, MovementType, SaleStatus, BusinessStatus, MembershipRole } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';
import { AppError, ErrorCodes } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { getDateComponentsInTimezone } from '@/lib/utils/date-utils';

export type SaleItemInput = {
  productId: string;
  quantity: number;
  /**
   * Accepted for backward compatibility with offline-queued payloads, but the
   * server NEVER trusts client-calculated prices: the authoritative unit price
   * always comes from the product catalog (P2-07).
   */
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

  let saleResult;
  try {
    saleResult = await prisma.$transaction(async (tx) => {
    // 0. Validate Business status
    const business = await tx.business.findUnique({
      where: { id: params.businessId },
      select: { status: true, timezone: true },
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

      // P2-07: Server-authoritative pricing. The unit price is ALWAYS read
      // from the product catalog at sale time; client-supplied prices are
      // ignored (they may be stale offline-queue values or tampered).
      const sellingPrice = Number(product.sellingPrice);
      if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Product ${product.name} has no valid selling price configured.`,
          400
        );
      }

      const costPrice = Number(product.purchasePrice);
      const grossLineValue = sellingPrice * item.quantity;
      const rawLineDiscount = item.discount ?? 0;
      if (!Number.isFinite(rawLineDiscount) || rawLineDiscount < 0) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Item discount cannot be negative.', 400);
      }
      // Clamp so a discount can never drive a line below zero.
      const lineDiscount = Math.min(rawLineDiscount, grossLineValue);
      const baseLineTotal = grossLineValue - lineDiscount;

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
    const requestedGlobalDiscount = params.discount ?? 0;
    if (!Number.isFinite(requestedGlobalDiscount) || requestedGlobalDiscount < 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Discount cannot be negative.', 400);
    }

    // Enforce the configured role-based discount ceiling (existing business
    // rule in BusinessSetting) so discounts cannot bypass pricing controls.
    const membership = await tx.businessMembership.findUnique({
      where: { userId_businessId: { userId: params.userId, businessId: params.businessId } },
      select: { role: true },
    });
    const settings = await tx.businessSetting.findUnique({
      where: { businessId: params.businessId },
      select: { maxCashierDiscountPercent: true, maxManagerDiscountPercent: true },
    });
    const actorRole = membership?.role;
    const isOwner = actorRole === MembershipRole.OWNER;
    const maxDiscountPercent = isOwner
      ? null
      : Number(
          actorRole === MembershipRole.MANAGER
            ? settings?.maxManagerDiscountPercent ?? 15
            : settings?.maxCashierDiscountPercent ?? 5
        );

    const totalLineDiscount = processedItems.reduce((sum, i) => sum + i.discount, 0);
    const requestedTotalDiscount = totalLineDiscount + Math.min(requestedGlobalDiscount, rawSubtotal);
    if (maxDiscountPercent !== null && rawSubtotal > 0) {
      const allowedDiscount = (rawSubtotal * maxDiscountPercent) / 100;
      if (requestedTotalDiscount > allowedDiscount + 0.005) {
        throw new AppError(
          ErrorCodes.UNAUTHORIZED,
          `Discount exceeds the ${maxDiscountPercent}% limit for your role. Ask a manager or owner to approve this sale.`,
          403
        );
      }
    }

    const globalDiscount = Math.min(requestedGlobalDiscount, rawSubtotal);
    const grandTotal = Math.max(0, rawSubtotal - globalDiscount);
    const rawPaid = params.paidAmount ?? 0;
    if (!Number.isFinite(rawPaid) || rawPaid < 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Paid amount cannot be negative.', 400);
    }
    const paidAmount = Math.max(0, rawPaid);
    // Change due back to the customer on overpayment (cash semantics).
    const changeDue = Math.max(0, paidAmount - grandTotal);

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
      
      // Apply below-cost business rule (P2-07): Prevent discounts from driving price below cost
      if (lineProfit < 0 && !isOwner) {
        throw new AppError(
          ErrorCodes.UNAUTHORIZED,
          `Selling below cost is restricted to Owners. Discount on one or more items exceeds their profit margin.`,
          403
        );
      }

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
    // Server-side invoice number (P3-01): date-prefixed sequential counter in
    // the business timezone, keeping the existing INV-YYMMDD-NNNNNN format.
    // The base value is derived from how many invoices already exist for the
    // business day, so numbers are collision-resistant by construction; the
    // (businessId, invoiceNumber) unique index plus a bounded retry loop
    // resolves any residual concurrent race, and client-supplied invoice
    // numbers are never trusted.
    const invoiceDateParts = getDateComponentsInTimezone(new Date(), business.timezone || 'Asia/Karachi');
    const dateStr = `${String(invoiceDateParts.year).slice(2)}${String(invoiceDateParts.month).padStart(2, '0')}${String(invoiceDateParts.day).padStart(2, '0')}`;
    const invoicePrefix = `INV-${dateStr}-`;

    const existingInvoiceCount = await tx.sale.count({
      where: { businessId: params.businessId, invoiceNumber: { startsWith: invoicePrefix } },
    });
    // Keep the historical 6-digit suffix range so numbering stays consistent
    // with previously issued invoices.
    let nextSuffix = Math.max(existingInvoiceCount + 1, 100000);

    let createdSale: any = null;
    let invoiceNumber = '';

    for (let attempt = 0; attempt < 5; attempt++) {
      invoiceNumber = nextSuffix <= 999999
        ? `${invoicePrefix}${nextSuffix}`
        : `${invoicePrefix}${randomInt(1000000, 10000000)}`;
      try {
        createdSale = await tx.sale.create({
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
            branch: true,
          },
        });
        break;
      } catch (error) {
        const prismaCode = (error as { code?: string } | null)?.code;
        const metaTarget = (error as { meta?: { target?: unknown } } | null)?.meta?.target;
        const targetStr = Array.isArray(metaTarget)
          ? metaTarget.join(',')
          : String(metaTarget ?? '');
        const isInvoiceCollision =
          prismaCode === 'P2002' && targetStr.includes('invoiceNumber');
        if (!isInvoiceCollision) {
          throw error;
        }
        // Concurrent collision: advance the sequence and retry.
        nextSuffix += 1;
      }
    }

    if (!createdSale) {
      logger.error('Invoice number generation failed after retries', {
        businessId: params.businessId,
      });
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        'Could not allocate a unique invoice number. Please retry the sale.',
        500
      );
    }

    const sale = createdSale;

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

    return { ...sale, changeDue };
    });
  } catch (error) {
    // Database-enforced idempotency guard. The (businessId, clientTransactionId)
    // unique index rejects a concurrent duplicate submission; that transaction is
    // fully rolled back, so stock and Udhaar were never touched by the loser.
    // Return the already-created sale so the duplicate request safely reuses it.
    const prismaCode = (error as { code?: string } | null)?.code;
    if (prismaCode === 'P2002' && params.clientTransactionId) {
      logger.warn('Concurrent duplicate sale submission resolved by unique index; returning existing sale', {
        businessId: params.businessId,
        clientTransactionId: params.clientTransactionId,
      });
      const existingSale = await prisma.sale.findFirst({
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
        return existingSale;
      }
    }
    throw error;
  }

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
      if (/^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
        // Date-only input: include the entire end date (UTC day).
        where.saleDate.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
      } else {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.saleDate.lte = end;
      }
    }
  }

  // P2-06: summary metrics reflect ACTIVE sales. When no explicit status
  // filter is chosen, cancelled/refunded invoices are excluded from totals.
  // Selecting a specific status (including CANCELLED) reports on exactly
  // that set, preserving historical visibility.
  const summaryWhere: any = { ...where }; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!filters.status || filters.status === 'ALL') {
    summaryWhere.status = SaleStatus.COMPLETED;
  }

  const [sales, totalCount, activeCount, aggregate, itemsAggregate] = await Promise.all([
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
    prisma.sale.count({ where: summaryWhere }),
    prisma.sale.aggregate({
      where: summaryWhere,
      _sum: {
        total: true,
        paidAmount: true,
      },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: summaryWhere,
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
      invoiceCount: activeCount,
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
    // Atomic COMPLETED -> CANCELLED transition. updateMany locks the row for the
    // duration of this transaction, so exactly one concurrent cancellation can
    // win; the loser sees count === 0 and aborts without restoring stock or
    // reversing Udhaar a second time.
    const transition = await tx.sale.updateMany({
      where: { id: saleId, businessId, status: SaleStatus.COMPLETED },
      data: { status: SaleStatus.CANCELLED },
    });

    if (transition.count === 0) {
      const existing = await tx.sale.findFirst({
        where: { id: saleId, businessId },
        select: { status: true },
      });
      if (!existing) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Sale not found', 404);
      }
      throw new AppError(ErrorCodes.CONFLICT, 'Sale is already cancelled.', 409);
    }

    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: true, customer: true, payments: true },
    });

    if (!sale) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Sale not found', 404);
    }

    // 1. Restore Product Stock & Create Reverse Stock Movement
    //    Atomic relative increments (row-locked) keep movements consistent.
    for (const item of sale.items) {
      const restored: Array<{ currentStock: number }> = await tx.$queryRaw`
        UPDATE "public"."Product"
        SET "currentStock" = "currentStock" + ${item.quantity}::integer,
            "updatedAt" = NOW()
        WHERE "id" = ${item.productId}::text
          AND "businessId" = ${businessId}::text
        RETURNING "currentStock";
      `;

      const resultingStock = Number(restored[0]?.currentStock ?? item.quantity);
      const previousStock = resultingStock - item.quantity;

      await tx.stockMovement.create({
        data: {
          businessId,
          branchId: sale.branchId,
          productId: item.productId,
          movementType: MovementType.RETURN,
          quantity: item.quantity,
          previousStock,
          resultingStock,
          referenceId: sale.id,
          notes: `Cancelled Sale #${sale.invoiceNumber}: ${reason}`,
          createdBy: userId,
        },
      });
    }

    // 2. Reverse Customer Credit, accounting for payments already recorded
    //    against this sale. Only the still-unpaid credit portion is reversed,
    //    and the reversal is clamped to the customer's current outstanding so
    //    the balance can never go negative. SELECT ... FOR UPDATE locks the
    //    customer row for the duration of the transaction, making concurrent
    //    payment/cancellation attempts serialize instead of corrupting the
    //    balance.
    let creditReversed = 0;
    const unpaidCredit = Number(sale.total) - Number(sale.paidAmount);
    if (unpaidCredit > 0 && sale.customerId) {
      const paymentsAgainstSale = sale.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const creditToReverse = Math.max(0, unpaidCredit - paymentsAgainstSale);

      if (creditToReverse > 0) {
        const lockedRows: Array<{ outstanding: string | number }> = await tx.$queryRaw`
          SELECT "outstanding"
          FROM "public"."Customer"
          WHERE "id" = ${sale.customerId}::text
            AND "businessId" = ${businessId}::text
          FOR UPDATE;
        `;

        if (lockedRows.length > 0) {
          const currentOutstanding = Number(lockedRows[0].outstanding);
          creditReversed = Math.min(currentOutstanding, creditToReverse);

          if (creditReversed > 0) {
            await tx.$executeRaw`
              UPDATE "public"."Customer"
              SET "outstanding" = "outstanding" - ${creditReversed}::numeric(12, 2),
                  "updatedAt" = NOW()
              WHERE "id" = ${sale.customerId}::text
                AND "businessId" = ${businessId}::text;
            `;
          }
        }
      }
    }

    // 3. Fetch final cancelled sale state (already marked CANCELLED atomically)
    const updatedSale = await tx.sale.findUnique({
      where: { id: sale.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!updatedSale) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Sale not found', 404);
    }

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
        paymentsAgainstSale: sale.payments.reduce((s, p) => s + Number(p.amount), 0),
        creditReversed,
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
