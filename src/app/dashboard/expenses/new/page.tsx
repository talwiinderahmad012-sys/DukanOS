import { requireActiveBusiness } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { getExpenseCategoriesAction } from '@/app/actions/expenses.actions';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { NewExpenseClient, type BranchOption } from './new-expense-client';

export default async function NewExpensePage() {
  const { membership } = await requireActiveBusiness();

  if (!canAccessDashboardPath(membership.role, '/dashboard/expenses/new')) {
    return <ForbiddenView role={membership.role} />;
  }

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';
  if (!isOwnerOrManager) {
    redirect('/dashboard/expenses');
  }

  const categoriesResult = await getExpenseCategoriesAction();
  const branches = await prisma.branch.findMany({
    where: { businessId: membership.businessId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const categories = categoriesResult.success && Array.isArray(categoriesResult.data) ? categoriesResult.data : [];
  const branchOptions: BranchOption[] = branches.map((b) => ({ id: b.id, name: b.name }));
  const todayDate = new Date().toISOString().split('T')[0];

  return <NewExpenseClient categories={categories} branches={branchOptions} todayDate={todayDate} />;
}
