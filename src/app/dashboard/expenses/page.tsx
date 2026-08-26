import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getExpensesAction, getExpenseCategoriesAction } from '@/app/actions/expenses.actions';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Plus,
  Search,
  SearchX,
  Banknote,
  FileText,
  XCircle,
  Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses, Select } from '@/components/ui/input';
import { CancelExpenseButton } from '@/components/expenses/cancel-expense-button';

const PAGE_SIZE = 25;

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

function formatExpenseDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function paymentMethodLabel(method: string): string {
  return method
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function buildExpensesHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/expenses?${qs}` : '/dashboard/expenses';
}

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

  const hasFilters =
    search !== '' || branchId !== 'ALL' || category !== 'ALL' || startDate !== '' || endDate !== '';

  const filterParams = {
    search: search || undefined,
    branchId: branchId !== 'ALL' ? branchId : undefined,
    category: category !== 'ALL' ? category : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const scopeLabel = hasFilters ? 'within the current filters' : 'across all expenses';
  const uniqueCategoryCount = new Set(expenses.map((e) => e.category)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track operational costs, utilities, rent, and overheads."
        actions={
          isOwnerOrManager ? (
            <Link href="/dashboard/expenses/new" className={buttonClasses('primary', 'md')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Expense
            </Link>
          ) : undefined
        }
      />

      {/* Summary KPI cards (real data from the current query scope) */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active Expenses</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmt(summary.totalAmount)}</p>
              <p className="mt-1 text-xs text-muted">
                {summary.totalCount} {summary.totalCount === 1 ? 'entry' : 'entries'} recorded {scopeLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">This Filter</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{expenses.length}</p>
              <p className="mt-1 text-xs text-muted">
                {expenses.length === 1 ? 'entry' : 'entries'} on this page
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Cancelled</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500" aria-hidden="true">
                <XCircle className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{summary.cancelledCount}</p>
              <p className="mt-1 text-xs text-muted">reversed entries (all time)</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Categories</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{uniqueCategoryCount}</p>
              <p className="mt-1 text-xs text-muted">unique types in view</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters + list */}
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label="Search and filter expenses" className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by category or description…"
                aria-label="Search expenses by category or description"
                className={inputClasses(false, 'pl-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
              <Select
                name="branchId"
                defaultValue={branchId}
                aria-label="Filter by branch"
                className="xl:w-48"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>

              <Select
                name="category"
                defaultValue={category}
                aria-label="Filter by category"
                className="xl:w-48"
              >
                <option value="ALL">All Categories</option>
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>

              <input
                type="date"
                name="startDate"
                defaultValue={startDate}
                aria-label="From date"
                title="From date"
                className={inputClasses(false, 'xl:w-40')}
              />

              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                aria-label="To date"
                title="To date"
                className={inputClasses(false, 'xl:w-40')}
              />

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto xl:shrink-0')}>
                Apply
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/expenses"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto xl:shrink-0')}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Empty states */}
        {expenses.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No matching expenses"
              description={
                search
                  ? `No expenses match “${search}” with the current filters. Try a different search or clear the filters.`
                  : 'No expenses match the current filters.'
              }
              action={
                <Link href={buildExpensesHref({})} className={buttonClasses('outline', 'sm')}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Banknote}
              title="No expenses recorded yet"
              description="Track operational costs to understand your true profitability and optimize spending."
              action={
                isOwnerOrManager ? (
                  <Link href="/dashboard/expenses/new" className={buttonClasses('primary', 'sm')}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Record First Expense
                  </Link>
                ) : undefined
              }
            />
          ))}

        {/* Desktop / tablet table */}
        {expenses.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[880px]">
                <TableHead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Category</Th>
                    <Th className="hidden lg:table-cell">Description</Th>
                    <Th className="hidden xl:table-cell">Branch</Th>
                    <Th className="hidden xl:table-cell">Payment</Th>
                    <Th className="text-right">Amount</Th>
                    <Th className="text-center">Status</Th>
                    <Th className="text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {expenses.map((expense) => {
                    const isCancelled = !!expense.cancelledAt;

                    return (
                      <Tr key={expense.id} className={isCancelled ? 'opacity-60' : undefined}>
                        <Td className="whitespace-nowrap text-sm text-gray-600">
                          {formatExpenseDate(expense.date)}
                        </Td>
                        <Td>
                          <span className="font-medium text-gray-900">{expense.category}</span>
                        </Td>
                        <Td className="hidden lg:table-cell max-w-[240px]">
                          <span className="block truncate text-sm text-muted" title={expense.description || undefined}>
                            {expense.description || '—'}
                          </span>
                        </Td>
                        <Td className="hidden xl:table-cell text-sm text-gray-600">
                          {expense.branch?.name || '—'}
                        </Td>
                        <Td className="hidden xl:table-cell text-sm text-gray-600">
                          {paymentMethodLabel(expense.paymentMethod)}
                        </Td>
                        <Td className="text-right">
                          <span className="font-semibold text-gray-900">{fmt(expense.amount)}</span>
                        </Td>
                        <Td className="text-center">
                          <Badge tone={isCancelled ? 'neutral' : 'success'}>
                            {isCancelled ? 'Cancelled' : 'Active'}
                          </Badge>
                        </Td>
                        <Td className="text-right">
                          {isOwnerOrManager && !isCancelled ? (
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/expenses/${expense.id}`}
                                className={buttonClasses('outline', 'sm')}
                                aria-label={`Edit expense: ${expense.category}, ${fmt(expense.amount)}`}
                              >
                                Edit
                              </Link>
                              <CancelExpenseButton
                                expenseId={expense.id}
                                category={expense.category}
                                amount={expense.amount}
                                size="sm"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted">View only</span>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            {/* Mobile expense cards */}
            <ul className="divide-y divide-border md:hidden">
              {expenses.map((expense) => {
                const isCancelled = !!expense.cancelledAt;

                return (
                  <li key={expense.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{expense.category}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatExpenseDate(expense.date)}
                          {expense.branch?.name ? ` · ${expense.branch.name}` : ''}
                          {' · '}
                          {paymentMethodLabel(expense.paymentMethod)}
                        </p>
                      </div>
                      <Badge tone={isCancelled ? 'neutral' : 'success'}>
                        {isCancelled ? 'Cancelled' : 'Active'}
                      </Badge>
                    </div>

                    {expense.description && (
                      <p className="line-clamp-2 text-sm text-muted">{expense.description}</p>
                    )}

                    <div className="flex items-end justify-between gap-3">
                      <p className="text-base font-bold text-gray-900">{fmt(expense.amount)}</p>
                    </div>

                    {isOwnerOrManager && !isCancelled && (
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/dashboard/expenses/${expense.id}`}
                          className={buttonClasses('outline', 'sm', 'min-h-10 flex-1')}
                          aria-label={`Edit expense: ${expense.category}, ${fmt(expense.amount)}`}
                        >
                          Edit
                        </Link>
                        <CancelExpenseButton
                          expenseId={expense.id}
                          category={expense.category}
                          amount={expense.amount}
                          size="sm"
                          className="min-h-10 flex-1"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Pagination (preserves active filters) */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  Showing {rangeStart}–{rangeEnd} of {total} expenses
                </p>
                <nav aria-label="Expense pages" className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildExpensesHref({ ...filterParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
                      Previous
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      Previous
                    </span>
                  )}
                  <span className="px-1 text-xs font-semibold text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link href={buildExpensesHref({ ...filterParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
                      Next
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      Next
                    </span>
                  )}
                </nav>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
