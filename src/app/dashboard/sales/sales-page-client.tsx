'use client';

import Link from 'next/link';
import {
  Receipt,
  Search,
  SearchX,
  ShoppingCart,
  Banknote,
  TrendingUp,
  Clock,
  ChevronRight,
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

export type SaleRowData = {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  status: string;
  paymentMethod: string;
  total: number;
  paidAmount: number;
  itemCount: number;
  customer: { id: string; name: string } | null;
};

export type SalesSummaryData = {
  totalRevenue: number;
  totalPaid: number;
  totalProfit: number;
  remainingDue: number;
  invoiceCount: number;
};

export type CustomerOption = { id: string; name: string };

type BadgeLabel = { labelKey: string; tone: BadgeTone };

function paymentStatusOf(total: number, paid: number): BadgeLabel {
  if (paid >= total && total > 0) return { labelKey: 'common.paid', tone: 'success' };
  if (paid > 0 && paid < total) return { labelKey: 'sales.payPartial', tone: 'warning' };
  return { labelKey: 'sales.payUdhaar', tone: 'danger' };
}

function saleStatusOf(status: string): BadgeLabel {
  if (status === 'CANCELLED') return { labelKey: 'common.cancelled', tone: 'neutral' };
  if (status === 'REFUNDED') return { labelKey: 'sales.statusRefunded', tone: 'info' };
  return { labelKey: 'common.completed', tone: 'success' };
}

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  CASH: 'sales.payCash',
  CARD: 'sales.payCard',
  BANK_TRANSFER: 'sales.payBankTransfer',
  MOBILE_WALLET: 'sales.payMobileWallet',
  CREDIT: 'sales.payCredit',
};

function paymentMethodKey(method: string): string {
  return PAYMENT_METHOD_LABEL_KEYS[method] ?? '';
}

function buildSalesHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/sales?${qs}` : '/dashboard/sales';
}

export function SalesPageClient({
  sales,
  summary,
  customers,
  totalPages,
  totalCount,
  search,
  customerId,
  status,
  paymentStatus,
  startDate,
  endDate,
  page,
}: {
  sales: SaleRowData[];
  summary: SalesSummaryData;
  customers: CustomerOption[];
  totalPages: number;
  totalCount: number;
  search: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  page: number;
}) {
  const { language, t, formatCurrency, formatNumber } = useTranslation();

  const formatSaleDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(language === 'UR' ? 'ur-PK' : 'en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const payMethodLabel = (method: string): string => {
    const key = paymentMethodKey(method);
    return key ? t(key) : method;
  };

  const hasFilters =
    search !== '' ||
    customerId !== 'ALL' ||
    status !== 'ALL' ||
    paymentStatus !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const filterParams = {
    search: search || undefined,
    customerId: customerId !== 'ALL' ? customerId : undefined,
    status: status !== 'ALL' ? status : undefined,
    paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const scopeLabel = hasFilters ? t('sales.scopeFiltered') : t('sales.scopeAll');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sales.title')}
        description={t('sales.description')}
        actions={
          <Link href="/dashboard/pos" className={buttonClasses('primary', 'md')}>
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {t('sales.newSalePos')}
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('sales.statTotalSales')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted">
                {summary.invoiceCount === 1
                  ? t('sales.invoicesOne', { count: formatNumber(summary.invoiceCount), scope: scopeLabel })
                  : t('sales.invoicesMany', { count: formatNumber(summary.invoiceCount), scope: scopeLabel })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('sales.statCollected')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatCurrency(summary.totalPaid)}</p>
              <p className="mt-1 text-xs text-muted">
                {t('sales.collectedSub', { scope: hasFilters ? t('sales.scopeInFilters') : t('sales.scopeToDate') })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('sales.statOutstandingUdhaar')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', summary.remainingDue > 0 ? 'text-warning' : 'text-gray-900')}>
                {formatCurrency(summary.remainingDue)}
              </p>
              <p className="mt-1 text-xs text-muted">{t('sales.outstandingSub', { scope: scopeLabel })}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('sales.statRealizedProfit')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatCurrency(summary.totalProfit)}</p>
              <p className="mt-1 text-xs text-muted">{t('sales.profitSub')}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label={t('sales.searchFormAria')} className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder={t('sales.searchPlaceholder')}
                aria-label={t('sales.searchAria')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
              <Select
                name="customerId"
                defaultValue={customerId}
                aria-label={t('sales.filterCustomerAria')}
                className="xl:w-52"
              >
                <option value="ALL">{t('sales.allCustomers')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>

              <Select
                name="paymentStatus"
                defaultValue={paymentStatus}
                aria-label={t('sales.filterPaymentStatusAria')}
                className="xl:w-48"
              >
                <option value="ALL">{t('sales.allPaymentStatuses')}</option>
                <option value="PAID">{t('common.paid')}</option>
                <option value="PARTIAL">{t('sales.payPartial')}</option>
                <option value="UNPAID">{t('sales.payStatusUnpaid')}</option>
              </Select>

              <Select
                name="status"
                defaultValue={status}
                aria-label={t('sales.filterStatusAria')}
                className="xl:w-44"
              >
                <option value="ALL">{t('sales.allStates')}</option>
                <option value="COMPLETED">{t('common.completed')}</option>
                <option value="CANCELLED">{t('common.cancelled')}</option>
                <option value="REFUNDED">{t('sales.statusRefunded')}</option>
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
                  href="/dashboard/sales"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto xl:shrink-0')}
                >
                  {t('common.clear')}
                </Link>
              )}
            </div>
          </form>
        </div>

        {sales.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('sales.noMatchTitle')}
              description={
                search
                  ? t('sales.noMatchSearch', { search })
                  : t('sales.noMatchFilters')
              }
              action={
                <Link href={buildSalesHref({})} className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title={t('sales.noSalesTitle')}
              description={t('sales.noSalesDescription')}
              action={
                <Link href="/dashboard/pos" className={buttonClasses('primary', 'sm')}>
                  <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('sales.newSalePos')}
                </Link>
              }
            />
          ))}

        {sales.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[960px]">
                <TableHead>
                  <tr>
                    <Th>{t('sales.invoice')}</Th>
                    <Th>{t('common.date')}</Th>
                    <Th>{t('common.customer')}</Th>
                    <Th className="hidden xl:table-cell text-center">{t('common.items')}</Th>
                    <Th className="text-end">{t('common.total')}</Th>
                    <Th className="hidden lg:table-cell text-end">{t('common.paid')}</Th>
                    <Th className="hidden lg:table-cell text-end">{t('sales.due')}</Th>
                    <Th>{t('sales.payment')}</Th>
                    <Th>{t('common.status')}</Th>
                    <Th className="text-end">
                      <span className="sr-only">{t('common.actions')}</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {sales.map((sale) => {
                    const total = sale.total;
                    const paid = sale.paidAmount;
                    const remaining = Math.max(0, total - paid);
                    const payment = paymentStatusOf(total, paid);
                    const saleStatus = saleStatusOf(sale.status);

                    return (
                      <Tr key={sale.id}>
                        <Td>
                          <Link
                            href={`/dashboard/sales/${sale.id}`}
                            className="font-mono text-sm font-semibold text-primary hover:text-primary-hover hover:underline"
                          >
                            {sale.invoiceNumber}
                          </Link>
                        </Td>
                        <Td className="whitespace-nowrap text-sm text-gray-600">{formatSaleDate(sale.saleDate)}</Td>
                        <Td className="max-w-[200px]">
                          {sale.customer ? (
                            <Link
                              href={`/dashboard/customers/${sale.customer.id}`}
                              className="block truncate font-medium text-gray-900 hover:text-primary hover:underline"
                            >
                              {sale.customer.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted italic">{t('sales.walkInCustomer')}</span>
                          )}
                        </Td>
                        <Td className="hidden xl:table-cell text-center text-sm text-gray-600">
                          {sale.itemCount === 1
                            ? t('sales.itemsOne', { count: formatNumber(sale.itemCount) })
                            : t('sales.itemsMany', { count: formatNumber(sale.itemCount) })}
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
                        <Td>
                          <Badge tone={payment.tone}>{t(payment.labelKey)}</Badge>
                          <p className="mt-0.5 text-xs text-muted">{payMethodLabel(sale.paymentMethod)}</p>
                        </Td>
                        <Td>
                          <Badge tone={saleStatus.tone}>{t(saleStatus.labelKey)}</Badge>
                        </Td>
                        <Td className="text-end">
                          <Link
                            href={`/dashboard/sales/${sale.id}`}
                            className={buttonClasses('outline', 'sm')}
                            aria-label={t('sales.viewInvoiceAria', { invoice: sale.invoiceNumber })}
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
              {sales.map((sale) => {
                const total = sale.total;
                const paid = sale.paidAmount;
                const remaining = Math.max(0, total - paid);
                const payment = paymentStatusOf(total, paid);
                const saleStatus = saleStatusOf(sale.status);

                return (
                  <li key={sale.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="block truncate font-mono text-sm font-semibold text-primary hover:underline"
                        >
                          {sale.invoiceNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatSaleDate(sale.saleDate)} · {payMethodLabel(sale.paymentMethod)}
                        </p>
                      </div>
                      <Badge tone={payment.tone}>{t(payment.labelKey)}</Badge>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {sale.customer ? sale.customer.name : t('sales.walkInCustomer')}
                        </p>
                        <p className="text-xs text-muted">
                          {sale.itemCount === 1
                            ? t('sales.itemsOne', { count: formatNumber(sale.itemCount) })
                            : t('sales.itemsMany', { count: formatNumber(sale.itemCount) })}
                          {remaining > 0 && ` · ${t('sales.dueAmount', { amount: formatCurrency(remaining) })}`}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-base font-bold text-gray-900">{formatCurrency(total)}</p>
                        <p className="text-xs text-muted">{t('sales.paidAmountShort', { amount: formatCurrency(paid) })}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Badge tone={saleStatus.tone}>{t(saleStatus.labelKey)}</Badge>
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className={buttonClasses('outline', 'sm', 'min-h-10 flex-1 sm:flex-initial')}
                        aria-label={t('sales.viewInvoiceAria', { invoice: sale.invoiceNumber })}
                      >
                        {t('sales.viewInvoice')}
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
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildSalesHref({ ...filterParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildSalesHref({ ...filterParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
                      {t('common.next')}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      {t('common.next')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
