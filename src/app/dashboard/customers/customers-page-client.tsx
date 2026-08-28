'use client';

import Link from 'next/link';
import {
  Users,
  UserCheck,
  Wallet,
  Banknote,
  Search,
  SearchX,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { AddCustomerButton } from '@/components/customers/add-customer-button';
import { CustomerActions, type CustomerActionData } from '@/components/customers/customer-actions';
import { useTranslation } from '@/lib/i18n/language-context';

type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type StatusFilter = 'ALL' | CustomerStatus;
type UdhaarFilter = 'ALL' | 'HAS_OUTSTANDING';

export type CustomerListRow = CustomerActionData & {
  salesCount: number;
  paymentsCount: number;
  updatedAt: string;
};

const STATUS_BADGE: Record<CustomerStatus, { labelKey: string; tone: BadgeTone }> = {
  ACTIVE: { labelKey: 'customers.statusActive', tone: 'success' },
  INACTIVE: { labelKey: 'customers.statusInactive', tone: 'warning' },
  ARCHIVED: { labelKey: 'customers.statusArchived', tone: 'neutral' },
};

function buildCustomersHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/customers?${qs}` : '/dashboard/customers';
}

export function CustomersPageClient({
  businessId,
  canCreate,
  canManage,
  search,
  statusFilter,
  udhaarFilter,
  page,
  totalPages,
  totalInScope,
  rangeStart,
  rangeEnd,
  totalCustomers,
  totalOutstanding,
  activeUdhaarCustomers,
  totalCollected,
  scopedTotal,
  scopedWithUdhaar,
  rows,
}: {
  businessId: string;
  canCreate: boolean;
  canManage: boolean;
  search: string;
  statusFilter: StatusFilter;
  udhaarFilter: UdhaarFilter;
  page: number;
  totalPages: number;
  totalInScope: number;
  rangeStart: number;
  rangeEnd: number;
  totalCustomers: number;
  totalOutstanding: number;
  activeUdhaarCustomers: number;
  totalCollected: number;
  scopedTotal: number;
  scopedWithUdhaar: number;
  rows: CustomerListRow[];
}) {
  const { t, formatCurrency, language } = useTranslation();
  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const fmtActivity = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const hasFilters = search !== '' || statusFilter !== 'ALL' || udhaarFilter !== 'ALL';

  const udhaarTabs: { key: UdhaarFilter; label: string; count: number }[] = [
    { key: 'ALL', label: t('common.all'), count: scopedTotal },
    { key: 'HAS_OUTSTANDING', label: t('customers.hasUdhaar'), count: scopedWithUdhaar },
  ];

  const udhaarBadge = (
    outstanding: number,
    paymentsCount: number,
  ): { label: string; tone: BadgeTone } => {
    if (outstanding > 0) return { label: t('customers.outstanding'), tone: 'warning' };
    if (paymentsCount > 0) return { label: t('customers.settled'), tone: 'info' };
    return { label: t('customers.clear'), tone: 'success' };
  };

  const filterParams = {
    search: search || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    udhaar: udhaarFilter === 'HAS_OUTSTANDING' ? '1' : undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('common.customers')}
        description={t('customers.pageDescription')}
        actions={canCreate ? <AddCustomerButton businessId={businessId} /> : undefined}
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('customers.totalCustomers')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{totalCustomers}</p>
              <p className="mt-1 text-xs text-muted">{t('customers.activeAccounts')}</p>
            </div>
          </div>

          <Link
            href={buildCustomersHref({ ...filterParams, udhaar: '1' })}
            aria-label={t('customers.viewUdhaarCustomers', { count: activeUdhaarCustomers })}
            className="group flex flex-col gap-2 bg-surface p-4 transition-colors hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('customers.customersWithUdhaar')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <UserCheck className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', activeUdhaarCustomers > 0 ? 'text-warning' : 'text-gray-900')}>
                {activeUdhaarCustomers}
              </p>
              <p className="mt-1 text-xs text-muted group-hover:text-gray-600">{t('customers.havePendingBalance')}</p>
            </div>
          </Link>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('customers.totalOutstanding')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger" aria-hidden="true">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', totalOutstanding > 0 ? 'text-danger' : 'text-gray-900')}>
                {formatCurrency(totalOutstanding)}
              </p>
              <p className="mt-1 text-xs text-muted">{t('customers.udhaarReceivable')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('customers.paymentsCollected')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatCurrency(totalCollected)}</p>
              <p className="mt-1 text-xs text-muted">{t('customers.allTimeRecoveries')}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label={t('customers.searchAndFilter')} className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder={t('customers.searchPlaceholder')}
                aria-label={t('customers.searchAriaLabel')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Select name="status" defaultValue={statusFilter} aria-label={t('customers.filterByStatus')} className="sm:w-44">
                <option value="ALL">{t('customers.allStatuses')}</option>
                <option value="ACTIVE">{t('customers.statusActive')}</option>
                <option value="INACTIVE">{t('customers.statusInactive')}</option>
                <option value="ARCHIVED">{t('customers.statusArchived')}</option>
              </Select>

              {udhaarFilter !== 'ALL' && <input type="hidden" name="udhaar" value="1" />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                {t('common.apply')}
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/customers"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto sm:shrink-0')}
                >
                  {t('customers.clear')}
                </Link>
              )}
            </div>
          </form>

          <nav aria-label={t('customers.filterByUdhaar')} className="overflow-x-auto">
            <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
              {udhaarTabs.map((tab) => {
                const active = udhaarFilter === tab.key;
                return (
                  <li key={tab.key} className="flex-1 sm:flex-initial">
                    <Link
                      href={buildCustomersHref({
                        ...filterParams,
                        udhaar: tab.key === 'HAS_OUTSTANDING' ? '1' : undefined,
                      })}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors',
                        active ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-900',
                      )}
                    >
                      {tab.label}
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                          active ? 'bg-primary-soft text-primary' : 'bg-gray-200 text-gray-600',
                          tab.key === 'HAS_OUTSTANDING' && tab.count > 0 && !active && 'bg-warning-soft text-warning',
                        )}
                      >
                        {tab.count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {rows.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('customers.noCustomersFound')}
              description={
                search
                  ? t('customers.noMatchSearch', { search })
                  : t('customers.noMatchFilters')
              }
              action={
                <Link href={buildCustomersHref({})} className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title={t('customers.noCustomersYet')}
              description={t('customers.noCustomersYetDescription')}
              action={canCreate ? <AddCustomerButton businessId={businessId} /> : undefined}
            />
          ))}

        {rows.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[900px]">
                <TableHead>
                  <tr>
                    <Th>{t('customers.tableCustomer')}</Th>
                    <Th>{t('common.phone')}</Th>
                    <Th className="text-end">{t('customers.tablePurchases')}</Th>
                    <Th className="text-end">{t('customers.tableOutstandingUdhaar')}</Th>
                    <Th>{t('common.status')}</Th>
                    <Th className="hidden xl:table-cell">{t('customers.lastActivity')}</Th>
                    <Th className="text-end">
                      <span className="sr-only">{t('common.actions')}</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {rows.map((customer) => {
                    const udhaar = udhaarBadge(customer.outstanding, customer.paymentsCount);
                    const status = STATUS_BADGE[customer.status] ?? STATUS_BADGE.ACTIVE;

                    return (
                      <Tr key={customer.id}>
                        <Td className="max-w-[240px]">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="block truncate font-semibold text-gray-900 hover:text-primary"
                          >
                            {customer.name}
                          </Link>
                          {customer.address && (
                            <p className="truncate text-xs text-muted">{customer.address}</p>
                          )}
                        </Td>
                        <Td>
                          <p className="font-mono text-xs text-gray-700">{customer.phone || t('common.dash')}</p>
                          {customer.email && <p className="truncate text-xs text-muted">{customer.email}</p>}
                        </Td>
                        <Td className="text-end">
                          <p className="font-medium text-gray-900">{customer.salesCount}</p>
                          <p className="text-xs text-muted">{customer.salesCount === 1 ? t('common.sale') : t('common.sales')}</p>
                        </Td>
                        <Td className="text-end">
                          <p
                            className={cn(
                              'font-semibold',
                              customer.outstanding > 0 ? 'text-warning' : 'text-gray-500',
                            )}
                          >
                            {formatCurrency(customer.outstanding)}
                          </p>
                          <div className="mt-1 flex justify-end">
                            <Badge tone={udhaar.tone}>{udhaar.label}</Badge>
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={status.tone}>{t(status.labelKey)}</Badge>
                        </Td>
                        <Td className="hidden xl:table-cell text-xs text-muted">
                          {fmtActivity(customer.updatedAt)}
                        </Td>
                        <Td className="text-end">
                          <CustomerActions
                            businessId={businessId}
                            customer={customer}
                            canPay={canCreate}
                            canManage={canManage}
                            size="sm"
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            <ul className="divide-y divide-border md:hidden">
              {rows.map((customer) => {
                const udhaar = udhaarBadge(customer.outstanding, customer.paymentsCount);
                const status = STATUS_BADGE[customer.status] ?? STATUS_BADGE.ACTIVE;

                return (
                  <li key={customer.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="block truncate font-semibold text-gray-900"
                        >
                          {customer.name}
                        </Link>
                        <p className="truncate text-xs text-muted">
                          {[customer.phone || t('common.noPhone'), t(status.labelKey)].join(' · ')}
                        </p>
                      </div>
                      <CustomerActions
                        businessId={businessId}
                        customer={customer}
                        canPay={canCreate}
                        canManage={canManage}
                        size="lg"
                      />
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className={cn('text-sm font-bold', customer.outstanding > 0 ? 'text-warning' : 'text-gray-900')}>
                          {formatCurrency(customer.outstanding)}
                        </p>
                        <p className="text-xs text-muted">{t('customers.outstandingUdhaar')}</p>
                      </div>
                      <div className="text-end">
                        <Badge tone={udhaar.tone}>{udhaar.label}</Badge>
                        <p className="mt-1 text-xs text-muted">
                          {customer.salesCount} {customer.salesCount === 1 ? t('common.sale') : t('common.sales')} · {t('common.last')}{' '}
                          {fmtActivity(customer.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  {t('common.showingRange', { start: rangeStart, end: rangeEnd, total: totalInScope })}
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={buildCustomersHref({ ...filterParams, page: page - 1 })}
                      className={buttonClasses('outline', 'sm')}
                    >
                      {t('common.previous')}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      {t('common.previous')}
                    </span>
                  )}
                  <span className="px-1 text-xs font-semibold text-gray-700">
                    {t('common.pageOf', { page, totalPages })}
                  </span>
                  {page < totalPages ? (
                    <Link
                      href={buildCustomersHref({ ...filterParams, page: page + 1 })}
                      className={buttonClasses('outline', 'sm')}
                    >
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
