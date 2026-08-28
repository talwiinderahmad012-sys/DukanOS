'use client';

import Link from 'next/link';
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
import { CancelExpenseButton, CATEGORY_LABEL_KEYS } from '@/components/expenses/cancel-expense-button';
import { useTranslation } from '@/lib/i18n/language-context';

const PAGE_SIZE = 25;

export type ExpenseRowData = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  paymentMethod: string;
  cancelledAt: string | null;
  branch: { id: string; name: string } | null;
};

export type ExpensesSummaryData = {
  totalAmount: number;
  totalCount: number;
  cancelledCount: number;
};

export type BranchOption = { id: string; name: string };

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  CASH: 'expenses.payCash',
  CARD: 'expenses.payCard',
  BANK_TRANSFER: 'expenses.payBankTransfer',
  MOBILE_WALLET: 'expenses.payMobileWallet',
  CREDIT: 'expenses.payCredit',
};

function buildExpensesHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/expenses?${qs}` : '/dashboard/expenses';
}

export function ExpensesPageClient({
  expenses,
  summary,
  branches,
  categories,
  total,
  totalPages,
  isOwnerOrManager,
  search,
  branchId,
  category,
  startDate,
  endDate,
  page,
}: {
  expenses: ExpenseRowData[];
  summary: ExpensesSummaryData;
  branches: BranchOption[];
  categories: string[];
  total: number;
  totalPages: number;
  isOwnerOrManager: boolean;
  search: string;
  branchId: string;
  category: string;
  startDate: string;
  endDate: string;
  page: number;
}) {
  const { language, t, formatCurrency, formatNumber } = useTranslation();

  const formatExpenseDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(language === 'UR' ? 'ur-PK' : 'en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const paymentMethodLabel = (method: string): string => {
    const key = PAYMENT_METHOD_LABEL_KEYS[method] ?? '';
    return key ? t(key) : method;
  };

  const categoryLabel = (cat: string): string => {
    const key = CATEGORY_LABEL_KEYS[cat] ?? '';
    return key ? t(key) : cat;
  };

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
  const scopeLabel = hasFilters ? t('expenses.scopeFiltered') : t('expenses.scopeAll');
  const uniqueCategoryCount = new Set(expenses.map((e) => e.category)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('expenses.listTitle')}
        description={t('expenses.listDescription')}
        actions={
          isOwnerOrManager ? (
            <Link href="/dashboard/expenses/new" className={buttonClasses('primary', 'md')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('expenses.newExpenseButton')}
            </Link>
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('expenses.activeExpenses')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatCurrency(summary.totalAmount)}</p>
              <p className="mt-1 text-xs text-muted">
                {summary.totalCount === 1
                  ? t('expenses.entriesOne', { count: formatNumber(summary.totalCount), scope: scopeLabel })
                  : t('expenses.entriesMany', { count: formatNumber(summary.totalCount), scope: scopeLabel })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('expenses.thisFilter')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatNumber(expenses.length)}</p>
              <p className="mt-1 text-xs text-muted">
                {expenses.length === 1
                  ? t('expenses.entriesOnPageOne', { count: formatNumber(expenses.length) })
                  : t('expenses.entriesOnPageMany', { count: formatNumber(expenses.length) })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.cancelled')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500" aria-hidden="true">
                <XCircle className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatNumber(summary.cancelledCount)}</p>
              <p className="mt-1 text-xs text-muted">{t('expenses.reversedEntriesSub')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.categories')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatNumber(uniqueCategoryCount)}</p>
              <p className="mt-1 text-xs text-muted">{t('expenses.uniqueTypesSub')}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label={t('expenses.filterFormAria')} className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder={t('expenses.listSearchPlaceholder')}
                aria-label={t('expenses.listSearchAria')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
              <Select
                name="branchId"
                defaultValue={branchId}
                aria-label={t('expenses.filterBranchAria')}
                className="xl:w-48"
              >
                <option value="ALL">{t('expenses.allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>

              <Select
                name="category"
                defaultValue={category}
                aria-label={t('expenses.filterCategoryAria')}
                className="xl:w-48"
              >
                <option value="ALL">{t('expenses.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabel(cat)}
                  </option>
                ))}
              </Select>

              <input
                type="date"
                name="startDate"
                defaultValue={startDate}
                aria-label={t('common.fromDate')}
                title={t('common.fromDate')}
                className={inputClasses(false, 'xl:w-40')}
              />

              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                aria-label={t('common.toDate')}
                title={t('common.toDate')}
                className={inputClasses(false, 'xl:w-40')}
              />

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto xl:shrink-0')}>
                {t('common.apply')}
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/expenses"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto xl:shrink-0')}
                >
                  {t('common.clear')}
                </Link>
              )}
            </div>
          </form>
        </div>

        {expenses.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('expenses.noMatchTitle')}
              description={
                search
                  ? t('expenses.noMatchSearch', { search })
                  : t('expenses.noMatchFilters')
              }
              action={
                <Link href={buildExpensesHref({})} className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Banknote}
              title={t('expenses.noExpensesYet')}
              description={t('expenses.noExpensesYetDescription')}
              action={
                isOwnerOrManager ? (
                  <Link href="/dashboard/expenses/new" className={buttonClasses('primary', 'sm')}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('expenses.recordFirstExpense')}
                  </Link>
                ) : undefined
              }
            />
          ))}

        {expenses.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[880px]">
                <TableHead>
                  <tr>
                    <Th>{t('common.date')}</Th>
                    <Th>{t('expenses.tableCategory')}</Th>
                    <Th className="hidden lg:table-cell">{t('common.description')}</Th>
                    <Th className="hidden xl:table-cell">{t('expenses.branch')}</Th>
                    <Th className="hidden xl:table-cell">{t('expenses.payment')}</Th>
                    <Th className="text-end">{t('expenses.tableAmount')}</Th>
                    <Th className="text-center">{t('common.status')}</Th>
                    <Th className="text-end">
                      <span className="sr-only">{t('common.actions')}</span>
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
                          <span className="font-medium text-gray-900">{categoryLabel(expense.category)}</span>
                        </Td>
                        <Td className="hidden lg:table-cell max-w-[240px]">
                          <span className="block truncate text-sm text-muted" title={expense.description || undefined}>
                            {expense.description || t('common.dash')}
                          </span>
                        </Td>
                        <Td className="hidden xl:table-cell text-sm text-gray-600">
                          {expense.branch?.name || t('common.dash')}
                        </Td>
                        <Td className="hidden xl:table-cell text-sm text-gray-600">
                          {paymentMethodLabel(expense.paymentMethod)}
                        </Td>
                        <Td className="text-end">
                          <span className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</span>
                        </Td>
                        <Td className="text-center">
                          <Badge tone={isCancelled ? 'neutral' : 'success'}>
                            {isCancelled ? t('common.cancelled') : t('common.active')}
                          </Badge>
                        </Td>
                        <Td className="text-end">
                          {isOwnerOrManager && !isCancelled ? (
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/expenses/${expense.id}`}
                                className={buttonClasses('outline', 'sm')}
                                aria-label={t('expenses.editExpenseAria', {
                                  category: categoryLabel(expense.category),
                                  amount: formatCurrency(expense.amount),
                                })}
                              >
                                {t('common.edit')}
                              </Link>
                              <CancelExpenseButton
                                expenseId={expense.id}
                                category={expense.category}
                                amount={expense.amount}
                                size="sm"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted">{t('expenses.viewOnly')}</span>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            <ul className="divide-y divide-border md:hidden">
              {expenses.map((expense) => {
                const isCancelled = !!expense.cancelledAt;

                return (
                  <li key={expense.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{categoryLabel(expense.category)}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatExpenseDate(expense.date)}
                          {expense.branch?.name ? ` · ${expense.branch.name}` : ''}
                          {' · '}
                          {paymentMethodLabel(expense.paymentMethod)}
                        </p>
                      </div>
                      <Badge tone={isCancelled ? 'neutral' : 'success'}>
                        {isCancelled ? t('common.cancelled') : t('common.active')}
                      </Badge>
                    </div>

                    {expense.description && (
                      <p className="line-clamp-2 text-sm text-muted">{expense.description}</p>
                    )}

                    <div className="flex items-end justify-between gap-3">
                      <p className="text-base font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                    </div>

                    {isOwnerOrManager && !isCancelled && (
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/dashboard/expenses/${expense.id}`}
                          className={buttonClasses('outline', 'sm', 'min-h-10 flex-1')}
                          aria-label={t('expenses.editExpenseAria', {
                            category: categoryLabel(expense.category),
                            amount: formatCurrency(expense.amount),
                          })}
                        >
                          {t('common.edit')}
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

            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  {t('common.showingRange', {
                    start: formatNumber(rangeStart),
                    end: formatNumber(rangeEnd),
                    total: formatNumber(total),
                  })}
                </p>
                <nav aria-label={t('expenses.paginationAria')} className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildExpensesHref({ ...filterParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
                      {t('common.previous')}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      {t('common.previous')}
                    </span>
                  )}
                  <span className="px-1 text-xs font-semibold text-gray-700">
                    {t('common.pageOf', { page: formatNumber(page), totalPages: formatNumber(totalPages) })}
                  </span>
                  {page < totalPages ? (
                    <Link href={buildExpensesHref({ ...filterParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
                      {t('common.next')}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      {t('common.next')}
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
