'use client';

import Link from 'next/link';
import {
  Plus,
  Search,
  SearchX,
  Receipt,
  Banknote,
  Wallet,
  Truck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';

const PAGE_SIZE = 25;

export type PurchaseRowData = {
  id: string;
  invoiceNumber: string | null;
  purchaseDate: string;
  status: string;
  total: number;
  paidAmount: number;
  itemCount: number;
  supplier: { id: string; name: string } | null;
};

export type PurchasesSummaryData = {
  totalSpend: number;
  totalPaid: number;
  remainingDue: number;
  invoiceCount: number;
};

export type SupplierFilterOption = { id: string; name: string };

type BadgeLabel = { labelKey: string; tone: BadgeTone };

function paymentStatusOf(total: number, paid: number): BadgeLabel {
  if (paid >= total && total > 0) return { labelKey: 'purchases.paid', tone: 'success' };
  if (paid > 0 && paid < total) return { labelKey: 'purchases.partial', tone: 'warning' };
  return { labelKey: 'purchases.unpaid', tone: 'danger' };
}

function purchaseStatusOf(status: string): BadgeLabel {
  if (status === 'CANCELLED') return { labelKey: 'common.cancelled', tone: 'neutral' };
  return { labelKey: 'purchases.received', tone: 'info' };
}

function buildPurchasesHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/purchases?${qs}` : '/dashboard/purchases';
}

export function PurchasesPageClient({
  purchases,
  summary,
  suppliers,
  activeSupplierCount,
  totalPages,
  totalCount,
  canManage,
  search,
  supplierId,
  status,
  paymentStatus,
  startDate,
  endDate,
  page,
}: {
  purchases: PurchaseRowData[];
  summary: PurchasesSummaryData;
  suppliers: SupplierFilterOption[];
  activeSupplierCount: number;
  totalPages: number;
  totalCount: number;
  canManage: boolean;
  search: string;
  supplierId: string;
  status: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  page: number;
}) {
  const { language, t, formatCurrency, formatNumber } = useTranslation();

  const formatPurchaseDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(language === 'UR' ? 'ur-PK' : 'en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const hasFilters =
    search !== '' ||
    supplierId !== 'ALL' ||
    status !== 'ALL' ||
    paymentStatus !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const filterParams = {
    search: search || undefined,
    supplierId: supplierId !== 'ALL' ? supplierId : undefined,
    status: status !== 'ALL' ? status : undefined,
    paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const scopeLabel = hasFilters ? t('purchases.scopeFiltered') : t('purchases.scopeAll');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('purchases.listTitle')}
        description={t('purchases.listDescription')}
        actions={
          canManage ? (
            <Link href="/dashboard/purchases/new" className={buttonClasses('primary', 'md')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('purchases.newPurchaseButton')}
            </Link>
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('purchases.totalPurchases')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatCurrency(summary.totalSpend)}</p>
              <p className="mt-1 text-xs text-muted">
                {summary.invoiceCount === 1
                  ? t('purchases.invoiceCountOne', { count: formatNumber(summary.invoiceCount), scope: scopeLabel })
                  : t('purchases.invoiceCountMany', { count: formatNumber(summary.invoiceCount), scope: scopeLabel })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('purchases.statTotalPaid')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatCurrency(summary.totalPaid)}</p>
              <p className="mt-1 text-xs text-muted">{t('purchases.totalPaidSub')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('purchases.remainingBalance')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', summary.remainingDue > 0 ? 'text-warning' : 'text-gray-900')}>
                {formatCurrency(summary.remainingDue)}
              </p>
              <p className="mt-1 text-xs text-muted">{t('purchases.remainingBalanceSub')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('purchases.statActiveSuppliers')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info" aria-hidden="true">
                <Truck className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatNumber(activeSupplierCount)}</p>
              <Link href="/dashboard/suppliers" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                {t('purchases.viewVendorList')}
                <ArrowRight className="h-3 w-3 rtl-flip" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label={t('purchases.filterFormAria')} className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder={t('purchases.listSearchPlaceholder')}
                aria-label={t('purchases.listSearchAria')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
              <Select
                name="supplierId"
                defaultValue={supplierId}
                aria-label={t('purchases.filterSupplierAria')}
                className="xl:w-52"
              >
                <option value="ALL">{t('purchases.allSuppliers')}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>

              <Select
                name="paymentStatus"
                defaultValue={paymentStatus}
                aria-label={t('purchases.filterPaymentStatusAria')}
                className="xl:w-48"
              >
                <option value="ALL">{t('purchases.allPaymentStatuses')}</option>
                <option value="PAID">{t('purchases.fullyPaid')}</option>
                <option value="PARTIAL">{t('purchases.partiallyPaid')}</option>
                <option value="UNPAID">{t('purchases.unpaidDue')}</option>
              </Select>

              <Select
                name="status"
                defaultValue={status}
                aria-label={t('purchases.filterStateAria')}
                className="xl:w-44"
              >
                <option value="ALL">{t('purchases.allStates')}</option>
                <option value="RECEIVED">{t('purchases.received')}</option>
                <option value="CANCELLED">{t('common.cancelled')}</option>
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
                  href="/dashboard/purchases"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto xl:shrink-0')}
                >
                  {t('common.clear')}
                </Link>
              )}
            </div>
          </form>
        </div>

        {purchases.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('purchases.noMatchTitle')}
              description={
                search
                  ? t('purchases.noMatchSearch', { search })
                  : t('purchases.noMatchFilters')
              }
              action={
                <Link href={buildPurchasesHref({})} className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title={t('purchases.noPurchasesYet')}
              description={t('purchases.noPurchasesYetDescription')}
              action={
                canManage ? (
                  <Link href="/dashboard/purchases/new" className={buttonClasses('primary', 'sm')}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('purchases.createFirstPurchase')}
                  </Link>
                ) : undefined
              }
            />
          ))}

        {purchases.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[960px]">
                <TableHead>
                  <tr>
                    <Th>{t('purchases.invoiceNo')}</Th>
                    <Th>{t('purchases.tableSupplier')}</Th>
                    <Th>{t('common.date')}</Th>
                    <Th className="hidden xl:table-cell text-center">{t('purchases.tableItems')}</Th>
                    <Th className="text-end">{t('common.grandTotal')}</Th>
                    <Th className="hidden lg:table-cell text-end">{t('common.paid')}</Th>
                    <Th className="hidden lg:table-cell text-end">{t('purchases.remaining')}</Th>
                    <Th className="text-center">{t('purchases.tablePayment')}</Th>
                    <Th className="text-center">{t('common.status')}</Th>
                    <Th className="text-end">
                      <span className="sr-only">{t('common.actions')}</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {purchases.map((purchase) => {
                    const total = purchase.total;
                    const paid = purchase.paidAmount;
                    const remaining = Math.max(0, total - paid);
                    const payment = paymentStatusOf(total, paid);
                    const purchaseStatus = purchaseStatusOf(purchase.status);

                    return (
                      <Tr key={purchase.id}>
                        <Td>
                          <Link
                            href={`/dashboard/purchases/${purchase.id}`}
                            className="font-mono text-sm font-semibold text-primary hover:text-primary-hover hover:underline"
                          >
                            {purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`}
                          </Link>
                        </Td>
                        <Td className="max-w-[200px]">
                          {purchase.supplier ? (
                            <Link
                              href={`/dashboard/suppliers/${purchase.supplier.id}`}
                              className="block truncate font-medium text-gray-900 hover:text-primary hover:underline"
                            >
                              {purchase.supplier.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted italic">{t('purchases.directCashVendor')}</span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-sm text-gray-600">{formatPurchaseDate(purchase.purchaseDate)}</Td>
                        <Td className="hidden xl:table-cell text-center text-sm text-gray-600">
                          {purchase.itemCount === 1
                            ? t('purchases.itemsOne', { count: formatNumber(purchase.itemCount) })
                            : t('purchases.itemsMany', { count: formatNumber(purchase.itemCount) })}
                        </Td>
                        <Td className="text-end">
                          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                        </Td>
                        <Td className="hidden lg:table-cell text-end">
                          <span className={cn('text-sm', paid > 0 ? 'font-medium text-success' : 'text-muted')}>{formatCurrency(paid)}</span>
                        </Td>
                        <Td className="hidden lg:table-cell text-end">
                          <span className={cn('text-sm', remaining > 0 ? 'font-semibold text-warning' : 'text-muted')}>
                            {formatCurrency(remaining)}
                          </span>
                        </Td>
                        <Td className="text-center">
                          <Badge tone={payment.tone}>{t(payment.labelKey)}</Badge>
                        </Td>
                        <Td className="text-center">
                          <Badge tone={purchaseStatus.tone}>{t(purchaseStatus.labelKey)}</Badge>
                        </Td>
                        <Td className="text-end">
                          <Link
                            href={`/dashboard/purchases/${purchase.id}`}
                            className={buttonClasses('outline', 'sm')}
                            aria-label={t('purchases.viewPurchaseAria', {
                              invoice: purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`,
                            })}
                          >
                            {t('common.view')}
                            <ChevronRight className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
                          </Link>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            <ul className="divide-y divide-border md:hidden">
              {purchases.map((purchase) => {
                const total = purchase.total;
                const paid = purchase.paidAmount;
                const remaining = Math.max(0, total - paid);
                const payment = paymentStatusOf(total, paid);
                const purchaseStatus = purchaseStatusOf(purchase.status);
                const invoiceLabel = purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`;

                return (
                  <li key={purchase.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/purchases/${purchase.id}`}
                          className="block truncate font-mono text-sm font-semibold text-primary hover:underline"
                        >
                          {invoiceLabel}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatPurchaseDate(purchase.purchaseDate)} ·{' '}
                          {purchase.supplier ? purchase.supplier.name : t('purchases.directCashVendor')}
                        </p>
                      </div>
                      <Badge tone={payment.tone}>{t(payment.labelKey)}</Badge>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted">
                          {purchase.itemCount === 1
                            ? t('purchases.itemsOne', { count: formatNumber(purchase.itemCount) })
                            : t('purchases.itemsMany', { count: formatNumber(purchase.itemCount) })}
                          {remaining > 0 && ` · ${t('purchases.dueShort', { amount: formatCurrency(remaining) })}`}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-base font-bold text-gray-900">{formatCurrency(total)}</p>
                        <p className="text-xs text-muted">{t('purchases.paidShort', { amount: formatCurrency(paid) })}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Badge tone={purchaseStatus.tone}>{t(purchaseStatus.labelKey)}</Badge>
                      <Link
                        href={`/dashboard/purchases/${purchase.id}`}
                        className={buttonClasses('outline', 'sm', 'min-h-10 flex-1 sm:flex-initial')}
                        aria-label={t('purchases.viewPurchaseAria', { invoice: invoiceLabel })}
                      >
                        {t('purchases.viewInvoice')}
                        <ChevronRight className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
                      </Link>
                    </div>
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
                    total: formatNumber(totalCount),
                  })}
                </p>
                <nav aria-label={t('purchases.paginationAria')} className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildPurchasesHref({ ...filterParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildPurchasesHref({ ...filterParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
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
