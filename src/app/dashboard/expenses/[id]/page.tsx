import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getExpenseByIdAction, getExpenseCategoriesAction } from '@/app/actions/expenses.actions';
import { notFound, redirect } from 'next/navigation';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { ExpenseDetailClient, type ExpenseDetailData } from './expense-detail-client';

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership } = await getActiveBusiness().catch(() => notFound());

  if (!canAccessDashboardPath(membership.role, '/dashboard/expenses')) {
    return <ForbiddenView role={membership.role} />;
  }

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';
  if (!isOwnerOrManager) {
    redirect('/dashboard/expenses');
  }

  const { id } = await params;

  let expense;
  try {
    expense = await getExpenseByIdAction(id);
  } catch {
    notFound();
  }

  const categoriesResult = await getExpenseCategoriesAction();
  const categories = categoriesResult.success && Array.isArray(categoriesResult.data) ? categoriesResult.data : [];

  const data: ExpenseDetailData = {
    id: expense.id,
    category: expense.category,
    amount: Number(expense.amount),
    date: expense.date.toISOString(),
    description: expense.description,
    paymentMethod: expense.paymentMethod,
    cancelledAt: expense.cancelledAt ? expense.cancelledAt.toISOString() : null,
  };

  return <ExpenseDetailClient expense={data} categories={categories} />;
}
