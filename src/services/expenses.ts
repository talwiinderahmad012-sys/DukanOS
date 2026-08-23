import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './audit';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';

export async function createExpense(businessId: string, userId: string, data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  const expense = await prisma.expense.create({
    data: {
      businessId,
      ...data,
      createdBy: userId,
    }
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'EXPENSE_CREATED',
    entityType: 'Expense',
    entityId: expense.id,
    metadata: { amount: Number(expense.amount), category: expense.category }
  });

  try {
    invalidateAnalyticsCache({ businessId, branchId: expense.branchId || undefined, module: 'expenses' });
    publishAnalyticsEvent({ type: 'expense', businessId, branchId: expense.branchId || null, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the mutation
  }

  return expense;
}
