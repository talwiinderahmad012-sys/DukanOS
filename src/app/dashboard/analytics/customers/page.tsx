import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import {
  getTopCustomers,
  getCustomerGrowth,
  getUdhaarAnalytics,
} from '@/services/analytics';
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
import { MembershipRole } from '@/generated/prisma/client';

const fmt = (n: number) => `Rs. ${Math.round(Number(n || 0)).toLocaleString()}`;
const fmtN = (n: number) => Math.round(Number(n || 0)).toLocaleString();

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
] as const;

function buildHref(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/dashboard/analytics/customers?${qs}` : '/dashboard/analytics/customers';
}

const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default async function CustomersAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role !== MembershipRole.OWNER && membership.role !== MembershipRole.MANAGER) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const preset = params.preset || 'thisMonth';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let label = 'This Month';

  if (preset === 'custom' && params.start && params.end) {
    startDate = new Date(params.start);
    endDate = new Date(params.end);
    endDate.setHours(23, 59, 59, 999);
    label = 'Custom Range';
  } else {
    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = 'Today';
        break;
      case 'thisWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        label = 'This Week';
        break;
      }
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        label = 'Last Month';
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        label = 'This Year';
        break;
    }
  }

  const period = { start: startDate, end: endDate, label };

  const [topCustomers, customerGrowth, udhaar] = await Promise.all([
    getTopCustomers(business.id, 20, startDate, endDate),
    getCustomerGrowth(business.id, business.timezone || 'Asia/Karachi'),
    getUdhaarAnalytics(business.id, period, business.timezone || 'Asia/Karachi'),
  ]);

  const activePreset =
    preset === 'custom' && params.start && params.end
      ? 'custom'
      : (PRESETS.find((p) => p.key === preset)?.key ?? 'thisMonth');

  const growth = customerGrowth.growth;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <nav aria-label="Breadcrumb">
        <Link
          href="/dashboard/analytics"
          className="inline-flex h-9 items-center gap-1.5 rounded-input px-2 text-sm font-medium text-muted transition-colors hover:bg-gray-100 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Analytics
        </Link>
      </nav>

      <PageHeader
        title="Customer Analytics"
        description={`Customer growth and udhaar recovery · ${label}`}
        actions={
          <Link href="/dashboard/customers" className={buttonClasses('outline', 'md')}>
            <Users className="h-4 w-4" aria-hidden="true" />
            All Customers
          </Link>
        }
      />

      {/* Period selector */}
      <Card className="overflow-hidden">
        <div className="space-y-3 p-4">
          <nav aria-label="Select reporting period" className="overflow-x-auto">
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
                      {p.label}
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
                  Custom
                </Link>
              </li>
            </ul>
          </nav>

          <form method="GET" aria-label="Custom date range" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="preset" value="custom" />
            <div className="w-full min-w-[140px] flex-1 sm:max-w-44">
              <label htmlFor="analytics-start" className="mb-1 block text-xs font-medium text-muted">
                From
              </label>
              <input
                id="analytics-start"
                type="date"
                name="start"
                defaultValue={params.start || toInputDate(startDate)}
                className={inputClasses(false, 'h-10')}
              />
            </div>
            <div className="w-full min-w-[140px] flex-1 sm:max-w-44">
              <label htmlFor="analytics-end" className="mb-1 block text-xs font-medium text-muted">
                To
              </label>
              <input
                id="analytics-end"
                type="date"
                name="end"
                defaultValue={params.end || toInputDate(endDate)}
                className={inputClasses(false, 'h-10')}
              />
            </div>
            <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto')}>
              Apply Range
            </button>
          </form>
        </div>
      </Card>

      {/* Customer snapshot */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Customers</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmtN(customerGrowth.totalActive)}</p>
              <p className="mt-1 text-xs text-muted">active customer accounts</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">New This Month</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <UserPlus className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="flex items-center gap-2 text-2xl font-bold leading-tight text-gray-900">
                {fmtN(customerGrowth.newThisMonth)}
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
                    New
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">vs {fmtN(customerGrowth.newLastMonth)} last month</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Outstanding Udhaar</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger" aria-hidden="true">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', udhaar.totalOutstanding > 0 ? 'text-danger' : 'text-gray-900')}>
                {fmt(udhaar.totalOutstanding)}
              </p>
              <p className="mt-1 text-xs text-muted">total credit balance across customers</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Credit Recovery</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-success">{fmt(udhaar.paymentsReceivedThisPeriod)}</p>
              <p className="mt-1 text-xs text-muted">payments collected {label.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Udhaar movement */}
      <Card>
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">Udhaar Movement</h2>
          <p className="text-sm text-muted">Credit extended and recovered during {label.toLowerCase()}.</p>
        </div>
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
          <div className="bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">New Credit Given</p>
            <p className="mt-1 text-xl font-bold leading-tight text-warning">{fmt(udhaar.newCreditThisPeriod)}</p>
            <p className="mt-1 text-xs text-muted">unpaid portion of credit sales</p>
          </div>
          <div className="bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Payments Received</p>
            <p className="mt-1 text-xl font-bold leading-tight text-success">{fmt(udhaar.paymentsReceivedThisPeriod)}</p>
            <p className="mt-1 text-xs text-muted">udhaar recovered from customers</p>
          </div>
          <div className="bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Net Change</p>
            <p
              className={cn(
                'mt-1 flex items-center gap-2 text-xl font-bold leading-tight',
                udhaar.netChange > 0 ? 'text-danger' : 'text-success',
              )}
            >
              {udhaar.netChange > 0 ? '+' : ''}
              {fmt(udhaar.netChange)}
              <span className="text-xs font-semibold text-muted">
                {udhaar.netChange > 0 ? 'udhaar increased' : 'udhaar reduced'}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">new credit minus payments received</p>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">Top Outstanding Balances</h3>
          {udhaar.topDebtors.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No customers with outstanding udhaar. All clear.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {udhaar.topDebtors.map((d) => (
                <li key={d.customerId}>
                  <Link
                    href={`/dashboard/customers/${d.customerId}`}
                    className="flex items-center justify-between gap-3 rounded-input border border-border bg-gray-50 px-4 py-2.5 transition-colors hover:border-border-strong hover:bg-surface"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold text-gray-900">{d.name}</span>
                    <span className="shrink-0 text-sm font-bold text-danger">{fmt(d.outstanding)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Top customers */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Crown className="h-4 w-4 text-warning" aria-hidden="true" />
              Top Customers
            </h2>
            <p className="text-sm text-muted">
              {label} · ranked by total spent · cancelled sales excluded
            </p>
          </div>
        </div>

        {topCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customer purchases in this period"
            description="Sales linked to customers during the selected period will appear here."
          />
        ) : (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[640px]">
                <TableHead>
                  <tr>
                    <Th className="w-10">#</Th>
                    <Th>Customer</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Total Spent</Th>
                    <Th className="text-right">Outstanding Udhaar</Th>
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
                      <Td className="text-right font-medium text-gray-900">{fmtN(c.orderCount)}</Td>
                      <Td className="text-right font-semibold text-gray-900">{fmt(c.totalSpent)}</Td>
                      <Td className="text-right">
                        {c.outstanding > 0 ? (
                          <>
                            <p className="font-semibold text-danger">{fmt(c.outstanding)}</p>
                            <div className="mt-1 flex justify-end">
                              <Badge tone="danger">Outstanding</Badge>
                            </div>
                          </>
                        ) : (
                          <Badge tone="success">Clear</Badge>
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
                        <span className="mr-1.5 font-mono text-xs text-muted">{i + 1}.</span>
                        {c.name}
                      </Link>
                      {c.phone && <p className="truncate font-mono text-xs text-muted">{c.phone}</p>}
                    </div>
                    {c.outstanding > 0 ? <Badge tone="danger">Outstanding</Badge> : <Badge tone="success">Clear</Badge>}
                  </div>
                  <div className="flex items-end justify-between gap-3 text-sm">
                    <span className="text-muted">
                      {fmtN(c.orderCount)} {c.orderCount === 1 ? 'order' : 'orders'}
                    </span>
                    <span className="font-semibold text-gray-900">{fmt(c.totalSpent)}</span>
                  </div>
                  {c.outstanding > 0 && (
                    <p className="text-xs font-medium text-danger">Udhaar due: {fmt(c.outstanding)}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        All figures are calculated from your recorded sales and payments.
      </p>
    </div>
  );
}
