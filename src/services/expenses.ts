import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { PaymentMethod, MembershipRole } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';
import { AppError, ErrorCodes } from '@/lib/errors';
import { sanitizePlainText } from '@/lib/security/sanitizer';

export type Expense = {
  id: string;
  businessId: string;
  branchId: string | null;
  category: string;
  amount: number;
  date: Date;
  description: string | null;
  paymentMethod: PaymentMethod;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  branch?: { id: string; name: string } | null;
};

export type ExpenseListOptions = {
  branchId?: string | null;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  includeCancelled?: boolean;
};

export type ExpenseListResult = {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalAmount: number;
    totalCount: number;
    cancelledCount: number;
  };
};

export async function createExpense(businessId: string, userId: string, data: {
  category: string;
  amount: number;
  date?: Date | string;
  description?: string | null;
  paymentMethod?: PaymentMethod;
  branchId?: string | null;
}) {
  const category = sanitizePlainText(data.category);
  const description = data.description ? sanitizePlainText(data.description) : null;

  if (!category || category.trim().length < 2) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Expense category is required.', 400);
  }
  if (data.amount === undefined || data.amount === null || data.amount < 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Expense amount must be a non-negative number.', 400);
  }

  let branchId = data.branchId || null;
  if (branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, businessId },
      select: { id: true },
    });
    if (!branch) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Branch not found or does not belong to this business.', 404);
    }
  }

  const expense = await prisma.expense.create({
    data: {
      businessId,
      category: category.trim(),
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      description: description,
      paymentMethod: data.paymentMethod || PaymentMethod.CASH,
      branchId: branchId,
      createdBy: userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'EXPENSE_CREATED',
    entityType: 'Expense',
    entityId: expense.id,
    metadata: {
      amount: Number(expense.amount),
      category: expense.category,
      branchId: expense.branchId,
      paymentMethod: expense.paymentMethod,
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, branchId: expense.branchId || undefined, module: 'expenses' });
    publishAnalyticsEvent({ type: 'expense', businessId, branchId: expense.branchId || null, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the mutation
  }

  return mapExpense(expense);
}

export async function getExpenseById(businessId: string, expenseId: string): Promise<Expense> {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, businessId },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  if (!expense) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Expense not found.', 404);
  }

  return mapExpense(expense);
}

export async function listExpenses(businessId: string, options: ExpenseListOptions = {}): Promise<ExpenseListResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 25));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { businessId };

  if (!options.includeCancelled) {
    where.cancelledAt = null;
  }

  if (options.branchId) {
    where.branchId = options.branchId;
  }

  if (options.category) {
    where.category = { equals: options.category, mode: 'insensitive' };
  }

  if (options.startDate || options.endDate) {
    (where as any).date = {};
    if (options.startDate) (where as any).date = { ...(where as any).date, gte: new Date(options.startDate) };
    if (options.endDate) (where as any).date = { ...(where as any).date, lte: new Date(`${options.endDate}T23:59:59.999Z`) };
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    where.OR = [
      { category: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [expenses, total, activeAgg, cancelledCount] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where: { ...where, cancelledAt: null },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: { businessId, cancelledAt: { not: null } },
    }),
  ]);

  return {
    expenses: expenses.map(mapExpense),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    summary: {
      totalAmount: Number(activeAgg._sum.amount || 0),
      totalCount: total,
      cancelledCount,
    },
  };
}

export async function updateExpense(businessId: string, userId: string, expenseId: string, data: {
  category?: string;
  amount?: number;
  date?: Date | string;
  description?: string | null;
  paymentMethod?: PaymentMethod;
  branchId?: string | null;
}) {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, businessId },
  });

  if (!existing) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Expense not found.', 404);
  }

  if (existing.cancelledAt) {
    throw new AppError(ErrorCodes.CONFLICT, 'Cannot update a cancelled expense.', 409);
  }

  const updateData: Record<string, unknown> = {};

  if (data.category !== undefined) {
    const cat = sanitizePlainText(data.category);
    if (!cat || cat.trim().length < 2) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Expense category is required.', 400);
    }
    updateData.category = cat.trim();
  }

  if (data.amount !== undefined) {
    if (data.amount < 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Expense amount cannot be negative.', 400);
    }
    updateData.amount = data.amount;
  }

  if (data.date !== undefined) {
    updateData.date = new Date(data.date);
  }

  if (data.description !== undefined) {
    updateData.description = data.description ? sanitizePlainText(data.description) : null;
  }

  if (data.paymentMethod !== undefined) {
    updateData.paymentMethod = data.paymentMethod;
  }

  if (data.branchId !== undefined) {
    let branchId = data.branchId || null;
    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, businessId },
        select: { id: true },
      });
      if (!branch) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Branch not found or does not belong to this business.', 404);
      }
    }
    updateData.branchId = branchId;
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: updateData,
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'EXPENSE_UPDATED',
    entityType: 'Expense',
    entityId: expenseId,
    metadata: {
      changes: Object.keys(updateData),
      previousAmount: Number(existing.amount),
      newAmount: Number(updated.amount),
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, branchId: updated.branchId || undefined, module: 'expenses' });
  } catch {
    // cache invalidation must never break the mutation
  }

  return mapExpense(updated);
}

export async function cancelExpense(businessId: string, userId: string, expenseId: string) {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, businessId },
  });

  if (!existing) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Expense not found.', 404);
  }

  if (existing.cancelledAt) {
    throw new AppError(ErrorCodes.CONFLICT, 'Expense is already cancelled.', 409);
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      cancelledAt: new Date(),
      cancelledBy: userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'EXPENSE_CANCELLED',
    entityType: 'Expense',
    entityId: expenseId,
    metadata: {
      amount: Number(existing.amount),
      category: existing.category,
      branchId: existing.branchId,
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, branchId: updated.branchId || undefined, module: 'expenses' });
  } catch {
    // cache invalidation must never break the mutation
  }

  return mapExpense(updated);
}

export async function getExpenseCategories(businessId: string): Promise<string[]> {
  const expenses = await prisma.expense.findMany({
    where: { businessId, cancelledAt: null },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return expenses.map((e) => e.category);
}

function mapExpense(expense: {
  id: string;
  businessId: string;
  branchId: string | null;
  category: string;
  amount: unknown;
  date: Date;
  description: string | null;
  paymentMethod: PaymentMethod;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  branch?: { id: string; name: string } | null;
}): Expense {
  return {
    id: expense.id,
    businessId: expense.businessId,
    branchId: expense.branchId,
    category: expense.category,
    amount: Number(expense.amount),
    date: expense.date,
    description: expense.description,
    paymentMethod: expense.paymentMethod,
    createdBy: expense.createdBy,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    cancelledAt: expense.cancelledAt,
    cancelledBy: expense.cancelledBy,
    branch: expense.branch || null,
  };
}
