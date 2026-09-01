import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getExpensesAction, getExpenseCategoriesAction } from '@/app/actions/expenses.actions';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import {
  ExpensesPageClient,
  type ExpenseRowData,
  type ExpensesSummaryData,
  type BranchOption,
} from './expenses-page-client';

const PAGE_SIZE = 25;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    branchId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  // Expenses are financial data restricted to OWNER / MANAGER
  // (VIEW_FINANCIAL_REPORTS). CASHIER / EMPLOYEE are denied here.
  if (!canAccessDashboardPath(membership.role, '/dashboard/expenses')) {
    return <ForbiddenView role={membership.role} />;
  }

  const params = await searchParams;

  const search = (params.search ?? '').trim();
  const branchId = params.branchId || 'ALL';
  const category = params.category || 'ALL';
  const startDate = params.startDate || '';
  const endDate = params.endDate || '';
  const page = Math.max(1, Number(params.page) || 1);

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const [expensesData, branches, categories] = await Promise.all([
    getExpensesAction({
      search: search || undefined,
      branchId: branchId !== 'ALL' ? branchId : undefined,
      category: category !== 'ALL' ? category : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: PAGE_SIZE,
      includeCancelled: false,
    }),
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    getExpenseCategoriesAction(),
  ]);

  const { expenses, total, totalPages, summary } = expensesData;
  const expenseCategories = categories.success && Array.isArray(categories.data) ? categories.data : [];

  const rows: ExpenseRowData[] = expenses.map((expense) => ({
    id: expense.id,
    category: expense.category,
    amount: Number(expense.amount),
    date: expense.date.toISOString(),
    description: expense.description,
    paymentMethod: expense.paymentMethod,
    cancelledAt: expense.cancelledAt ? expense.cancelledAt.toISOString() : null,
    branch: expense.branch ? { id: expense.branch.id, name: expense.branch.name } : null,
  }));

  const summaryData: ExpensesSummaryData = {
    totalAmount: summary.totalAmount,
    totalCount: summary.totalCount,
    cancelledCount: summary.cancelledCount,
  };

  const branchOptions: BranchOption[] = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <ExpensesPageClient
      expenses={rows}
      summary={summaryData}
      branches={branchOptions}
      categories={expenseCategories}
      total={total}
      totalPages={totalPages}
      isOwnerOrManager={isOwnerOrManager}
      search={search}
      branchId={branchId}
      category={category}
      startDate={startDate}
      endDate={endDate}
      page={page}
    />
  );
}
