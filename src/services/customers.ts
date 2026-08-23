import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { PaymentMethod } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';
import { AppError, ErrorCodes } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';

export async function createCustomer(
  businessId: string,
  userId: string,
  data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
  }
) {
  const customer = await prisma.customer.create({
    data: {
      businessId,
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'CUSTOMER_CREATED',
    entityType: 'Customer',
    entityId: customer.id,
    metadata: { name: customer.name, phone: customer.phone },
  });

  return customer;
}

export async function updateCustomer(
  businessId: string,
  userId: string,
  customerId: string,
  data: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  }
) {
  const existing = await prisma.customer.findUnique({
    where: { id: customerId, businessId },
  });

  if (!existing) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Customer not found or does not belong to this business', 404);
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
      ...(data.address !== undefined && { address: data.address?.trim() || null }),
      ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      ...(data.status && { status: data.status, isActive: data.status === 'ACTIVE' }),
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'CUSTOMER_UPDATED',
    entityType: 'Customer',
    entityId: customerId,
    metadata: { name: updated.name, status: updated.status },
  });

  return updated;
}

export async function archiveCustomer(businessId: string, userId: string, customerId: string) {
  return updateCustomer(businessId, userId, customerId, { status: 'ARCHIVED' });
}

export async function getCustomersList(
  businessId: string,
  optionsOrSearch?: string | {
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'ALL';
    hasOutstanding?: boolean;
    page?: number;
    limit?: number;
  }
) {
  let search: string | undefined;
  let status: string | undefined = 'ALL';
  let hasOutstanding = false;
  let page = 1;
  let limit = 50;

  if (typeof optionsOrSearch === 'string') {
    search = optionsOrSearch;
  } else if (optionsOrSearch) {
    search = optionsOrSearch.search;
    status = optionsOrSearch.status || 'ALL';
    hasOutstanding = Boolean(optionsOrSearch.hasOutstanding);
    page = optionsOrSearch.page || 1;
    limit = optionsOrSearch.limit || 50;
  }

  const where: any = { businessId };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (hasOutstanding) {
    where.outstanding = { gt: 0 };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [customers, aggregate, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { sales: true, payments: true, feedbacks: true } },
      },
      orderBy: [{ outstanding: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.aggregate({
      where: { businessId, isActive: true },
      _sum: {
        outstanding: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalOutstanding = Number(aggregate._sum.outstanding || 0);
  const totalCustomers = aggregate._count.id;

  return {
    customers,
    summary: {
      totalCustomers,
      totalOutstanding,
    },
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

export type LedgerEntry = {
  id: string;
  date: Date;
  type: 'CREDIT_SALE' | 'PAYMENT' | 'SALE_CANCELLED';
  description: string;
  debit: number; // Increases customer debt
  credit: number; // Decreases customer debt
  runningBalance: number;
  referenceId?: string | null;
};

export async function getCustomerWithLedger(businessId: string, customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId, businessId },
    include: {
      sales: {
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
            },
          },
        },
        orderBy: { saleDate: 'desc' },
      },
      payments: {
        orderBy: { date: 'desc' },
      },
      feedbacks: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer) return null;

  // Build Chronological Unified Running Ledger
  const rawEvents: Array<{
    id: string;
    date: Date;
    type: 'CREDIT_SALE' | 'PAYMENT' | 'SALE_CANCELLED';
    description: string;
    debit: number;
    credit: number;
    referenceId?: string | null;
  }> = [];

  for (const sale of customer.sales) {
    const total = Number(sale.total);
    const paid = Number(sale.paidAmount);
    const unpaidCredit = total - paid;

    if (sale.status === 'COMPLETED' && unpaidCredit > 0) {
      rawEvents.push({
        id: `sale-${sale.id}`,
        date: sale.saleDate,
        type: 'CREDIT_SALE',
        description: `Credit Sale (Invoice #${sale.invoiceNumber})`,
        debit: unpaidCredit,
        credit: 0,
        referenceId: sale.id,
      });
    } else if (sale.status === 'CANCELLED' && unpaidCredit > 0) {
      // Reversal of credit from cancelled sale
      rawEvents.push({
        id: `sale-cancel-${sale.id}`,
        date: sale.updatedAt,
        type: 'SALE_CANCELLED',
        description: `Cancelled Sale Credit Reversal (#${sale.invoiceNumber})`,
        debit: 0,
        credit: unpaidCredit,
        referenceId: sale.id,
      });
    }
  }

  for (const payment of customer.payments) {
    rawEvents.push({
      id: `payment-${payment.id}`,
      date: payment.date,
      type: 'PAYMENT',
      description: `Payment Received (${payment.method})${payment.notes ? `: ${payment.notes}` : ''}`,
      debit: 0,
      credit: Number(payment.amount),
      referenceId: payment.id,
    });
  }

  // Sort chronological (oldest to newest) to compute running balance
  rawEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  let currentBalance = 0;
  const ledger: LedgerEntry[] = rawEvents.map((evt) => {
    currentBalance += evt.debit - evt.credit;
    return {
      ...evt,
      runningBalance: currentBalance,
    };
  });

  // Reverse back to newest first for UI display
  ledger.reverse();

  const totalSalesCount = customer.sales.filter((s) => s.status === 'COMPLETED').length;
  const totalSpend = customer.sales
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + Number(s.total), 0);
  const totalPaid = customer.sales
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + Number(s.paidAmount), 0) +
    customer.payments.reduce((acc, p) => acc + Number(p.amount), 0);

  const lastPurchaseDate = customer.sales[0]?.saleDate || null;

  return {
    customer,
    summary: {
      totalSalesCount,
      totalSpend,
      totalPaid,
      outstanding: Number(customer.outstanding),
      lastPurchaseDate,
    },
    sales: customer.sales,
    payments: customer.payments,
    ledger,
  };
}

export async function recordCustomerPayment(
  businessId: string,
  userId: string,
  customerId: string,
  amount: number,
  method: PaymentMethod = PaymentMethod.CASH,
  notes?: string | null
) {
  if (amount <= 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Payment amount must be greater than 0', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id: customerId, businessId },
    });

    if (!customer) throw new AppError(ErrorCodes.NOT_FOUND, 'Customer not found', 404);

    const payment = await tx.customerPayment.create({
      data: {
        businessId,
        customerId,
        amount,
        method,
        notes: notes || null,
        createdBy: userId,
      },
    });

    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: {
        outstanding: { decrement: amount },
      },
    });

    logger.warn('Customer payment recorded', { businessId, customerId, amount, method });

    await recordAuditLog({
      businessId,
      userId,
      action: 'CUSTOMER_PAYMENT_RECORDED',
      entityType: 'CustomerPayment',
      entityId: payment.id,
      metadata: {
        customerId,
        amount,
        method,
        remainingOutstanding: Number(updatedCustomer.outstanding),
      },
    });

    return updatedCustomer;
  });

  try {
    invalidateAnalyticsCache({ businessId, module: 'customers' });
    publishAnalyticsEvent({ type: 'payment', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the mutation
  }

  return result;
}
