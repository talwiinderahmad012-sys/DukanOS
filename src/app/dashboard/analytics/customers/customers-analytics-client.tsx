'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Wallet,
  Banknote,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Crown,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonClasses } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/input';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';

export type GrowthBadgeData = {
  status: 'UP' | 'DOWN' | 'FLAT' | 'NEW' | 'NO_BASELINE';
  formatted: string;
};

export type CustomersAnalyticsProps = {
  activePreset: string;
  startValue: string;
  endValue: string;
  periodKey: string;
  topCustomers: {
    customerId: string;
    name: string;
    phone?: string | null;
    totalSpent: number;
    orderCount: number;
    outstanding: number;
  }[];
  customerGrowth: {
    newThisMonth: number;
    newLastMonth: number;
    totalActive: number;
    growth: GrowthBadgeData;
  };
  udhaar: {
    totalOutstanding: number;
    newCreditThisPeriod: number;
    paymentsReceivedThisPeriod: number;
    netChange: number;
    topDebtors: { customerId: string; name: string; outstanding: number }[];
  };
};

const PRESETS = [
  { key: 'today', labelKey: 'common.today' },
  { key: 'thisWeek', labelKey: 'common.thisWeek' },
  { key: 'thisMonth', labelKey: 'common.thisMonth' },
  { key: 'lastMonth', labelKey: 'common.lastMonth' },
  { key: 'thisYear', labelKey: 'common.thisYear' },
] as const;

function periodLabelKey(key: string): string {
  switch (key) {
    case 'today': return 'common.today';
    case 'yesterday': return 'common.yesterday';
    case 'thisWeek': return 'common.thisWeek';
    case 'lastWeek': return 'common.lastWeek';
    case 'thisMonth': return 'common.thisMonth';
    case 'lastMonth': return 'common.lastMonth';
    case 'thisYear': return 'common.thisYear';
    case 'thisQuarter': return 'analytics.shared.thisQuarter';
    case 'lastYear': return 'analytics.shared.lastYear';
    case 'previous': return 'analytics.shared.previousPeriod';
    default: return 'common.customRange';
  }
}

function buildHref(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/dashboard/analytics/customers?${qs}` : '/dashboard/analytics/customers';
}

export function CustomersAnalyticsClient({
  activePreset,
  startValue,
  endValue,
  periodKey,
  topCustomers,
  customerGrowth,
  udhaar,
}: CustomersAnalyticsProps) {
  const { t, formatCurrency, formatNumber } = useTranslation();

  const label = t(periodLabelKey(periodKey));
  const growth = customerGrowth.growth;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <nav aria-label={t('analytics.customers.breadcrumbAria')}>
        <Link
          href="/dashboard/analytics"
          className="inline-flex h-9 items-center gap-1.5 rounded-input px-2 text-sm font-medium text-muted transition-colors hover:bg-gray-100 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 rtl-flip" aria-hidden="true" />
          {t('analytics.customers.backToAnalytics')}
        </Link>
      </nav>

      <PageHeader
        title={t('analytics.customers.title')}
        description={t('analytics.customers.subtitle', { period: label })}
        actions={
          <Link href="/dashboard/customers" className={buttonClasses('outline', 'md')}>
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('analytics.customers.allCustomers')}
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <div className="space-y-3 p-4">
          <nav aria-label={t('analytics.customers.selectPeriodAria')} className="overflow-x-auto">
            <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
              {PRESETS.map((p) => {
                const active = activePreset === p.key;
                return (
                  <li key={p.key} className="flex-1 sm:flex-initial">
                    <Link
                      href={buildHref({ preset: p.key === 'thisMonth' ? undefined : p.key })}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors',
                        active ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-900',
                      )}
                    >
                      {t(p.labelKey)}
                    </Link>
                  </li>
                );
              })}
              <li className="flex-1 sm:flex-initial">
                <Link
                  href={buildHref({ preset: 'custom' })}
                  aria-current={activePreset === 'custom' ? 'true' : undefined}
                  className={cn(
                    'flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors',
                    activePreset === 'custom'
                      ? 'bg-white text-gray-900 shadow-card'
                      : 'text-gray-500 hover:text-gray-900',
                  )}
                >
                  {t('analytics.shared.customPreset')}
                </Link>
              </li>
            </ul>
          </nav>

          <form method="GET" aria-label={t('analytics.customers.customRangeAria')} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="preset" value="custom" />
            <div className="w-full min-w-[140px] flex-1 sm:max-w-44">
              <label htmlFor="analytics-start" className="mb-1 block text-xs font-medium text-muted">
                {t('analytics.customers.from')}
              </label>
              <input
                id="analytics-start"
                type="date"
                name="start"
                defaultValue={startValue}
                className={inputClasses(false, 'h-10')}
              />
            </div>
            <div className="w-full min-w-[140px] flex-1 sm:max-w-44">
              <label htmlFor="analytics-end" className="mb-1 block text-xs font-medium text-muted">
                {t('analytics.customers.to')}
              </label>
              <input
                id="analytics-end"
                type="date"
                name="end"
                defaultValue={endValue}
                className={inputClasses(false, 'h-10')}
              />
            </div>
            <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto')}>
              {t('analytics.customers.applyRange')}
            </button>
          </form>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('analytics.customers.totalCustomers')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{formatNumber(customerGrowth.totalActive)}</p>
              <p className="mt-1 text-xs text-muted">{t('analytics.customers.activeAccountsSub')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('analytics.customers.newThisMonth')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <UserPlus className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="flex items-center gap-2 text-2xl font-bold leading-tight text-gray-900">
                {formatNumber(customerGrowth.newThisMonth)}
                {growth.status === 'UP' && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    {growth.formatted}
                  </span>
                )}
                {growth.status === 'DOWN' && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                    {growth.formatted}
                  </span>
                )}
                {growth.status === 'NO_BASELINE' && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    {t('common.new')}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">{t('analytics.customers.vsLastMonthCount', { count: formatNumber(customerGrowth.newLastMonth) })}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('analytics.customers.outstandingUdhaar')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger" aria-hidden="true">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', udhaar.totalOutstanding > 0 ? 'text-danger' : 'text-gray-900')}>
                {formatCurrency(udhaar.totalOutstanding)}
              </p>
              <p className="mt-1 text-xs text-muted">{t('analytics.customers.totalCreditBalanceSub')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('analytics.customers.creditRecovery')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-success">{formatCurrency(udhaar.paymentsReceivedThisPeriod)}</p>
              <p className="mt-1 text-xs text-muted">{t('analytics.customers.paymentsCollected', { period: label })}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">{t('analytics.customers.udhaarMovementTitle')}</h2>
          <p className="text-sm text-muted">{t('analytics.customers.udhaarMovementSub', { period: label })}</p>
        </div>
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
          <div className="bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('analytics.customers.newCreditGiven')}</p>
            <p className="mt-1 text-xl font-bold leading-tight text-warning">{formatCurrency(udhaar.newCreditThisPeriod)}</p>
            <p className="mt-1 text-xs text-muted">{t('analytics.customers.unpaidPortionSub')}</p>
          </div>
          <div className="bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('analytics.customers.paymentsReceivedLabel')}</p>
            <p className="mt-1 text-xl font-bold leading-tight text-success">{formatCurrency(udhaar.paymentsReceivedThisPeriod)}</p>
            <p className="mt-1 text-xs text-muted">{t('analytics.customers.udhaarRecoveredSub')}</p>
          </div>
          <div className="bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('analytics.customers.netChangeLabel')}</p>
            <p
              className={cn(
                'mt-1 flex items-center gap-2 text-xl font-bold leading-tight',
                udhaar.netChange > 0 ? 'text-danger' : 'text-success',
              )}
            >
              {udhaar.netChange > 0 ? '+' : ''}
              {formatCurrency(udhaar.netChange)}
              <span className="text-xs font-semibold text-muted">
                {udhaar.netChange > 0 ? t('analytics.customers.udhaarIncreased') : t('analytics.customers.udhaarReduced')}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">{t('analytics.customers.netChangeSub')}</p>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">{t('analytics.shared.topOutstandingBalances')}</h3>
          {udhaar.topDebtors.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t('analytics.customers.noOutstandingCustomers')}</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {udhaar.topDebtors.map((d) => (
                <li key={d.customerId}>
                  <Link
                    href={`/dashboard/customers/${d.customerId}`}
                    className="flex items-center justify-between gap-3 rounded-input border border-border bg-gray-50 px-4 py-2.5 transition-colors hover:border-border-strong hover:bg-surface"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold text-gray-900">{d.name}</span>
                    <span className="shrink-0 text-sm font-bold text-danger">{formatCurrency(d.outstanding)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Crown className="h-4 w-4 text-warning" aria-hidden="true" />
              {t('analytics.customers.topCustomersTitle')}
            </h2>
            <p className="text-sm text-muted">
              {t('analytics.customers.topCustomersSub', { period: label })}
            </p>
          </div>
        </div>

        {topCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('analytics.customers.emptyTitle')}
            description={t('analytics.customers.emptyDescription')}
          />
        ) : (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[640px]">
                <TableHead>
                  <tr>
                    <Th className="w-10">{t('analytics.shared.rankHeader')}</Th>
                    <Th>{t('analytics.shared.customerHeader')}</Th>
                    <Th className="text-end">{t('analytics.shared.orders')}</Th>
                    <Th className="text-end">{t('analytics.shared.totalSpent')}</Th>
                    <Th className="text-end">{t('analytics.customers.outstandingUdhaarHeader')}</Th>
                  </tr>
                </TableHead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <Tr key={c.customerId}>
                      <Td className="font-mono text-xs text-muted">{i + 1}</Td>
                      <Td className="max-w-[240px]">
                        <Link
                          href={`/dashboard/customers/${c.customerId}`}
                          className="block truncate font-semibold text-gray-900 hover:text-primary"
                        >
                          {c.name}
                        </Link>
                        {c.phone && <p className="font-mono text-xs text-muted">{c.phone}</p>}
                      </Td>
                      <Td className="text-end font-medium text-gray-900">{formatNumber(c.orderCount)}</Td>
                      <Td className="text-end font-semibold text-gray-900">{formatCurrency(c.totalSpent)}</Td>
                      <Td className="text-end">
                        {c.outstanding > 0 ? (
                          <>
                            <p className="font-semibold text-danger">{formatCurrency(c.outstanding)}</p>
                            <div className="mt-1 flex justify-end">
                              <Badge tone="danger">{t('analytics.customers.outstandingBadge')}</Badge>
                            </div>
                          </>
                        ) : (
                          <Badge tone="success">{t('analytics.customers.clearBadge')}</Badge>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            <ul className="divide-y divide-border md:hidden">
              {topCustomers.map((c, i) => (
                <li key={c.customerId} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/customers/${c.customerId}`}
                        className="block truncate text-sm font-semibold text-gray-900"
                      >
                        <span className="me-1.5 font-mono text-xs text-muted">{i + 1}.</span>
                        {c.name}
                      </Link>
                      {c.phone && <p className="truncate font-mono text-xs text-muted">{c.phone}</p>}
                    </div>
                    {c.outstanding > 0 ? <Badge tone="danger">{t('analytics.customers.outstandingBadge')}</Badge> : <Badge tone="success">{t('analytics.customers.clearBadge')}</Badge>}
                  </div>
                  <div className="flex items-end justify-between gap-3 text-sm">
                    <span className="text-muted">
                      {t('analytics.shared.ordersCount', { count: formatNumber(c.orderCount) })}
                    </span>
                    <span className="font-semibold text-gray-900">{formatCurrency(c.totalSpent)}</span>
                  </div>
                  {c.outstanding > 0 && (
                    <p className="text-xs font-medium text-danger">{t('analytics.customers.udhaarDue', { amount: formatCurrency(c.outstanding) })}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <ArrowUpRight className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
        {t('analytics.customers.figuresNote')}
      </p>
    </div>
  );
}
