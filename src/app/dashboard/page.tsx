import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Sparkles,
  PackagePlus,
  Truck,
  UserPlus,
  Banknote,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { generateAdvisorFindings, type AdvisorFinding } from '@/services/advisor';
import { getSalesTrend, getUdhaarAnalytics, getCurrentMonthPeriods } from '@/services/analytics';
import { SimpleBarChart } from '@/components/charts/bar-chart';
import { HealthGauge } from '@/components/charts/health-gauge';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, badgeClasses, type BadgeTone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

const fmt = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-3 bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        <span
          className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accent)}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <p className={cn('text-2xl font-bold leading-tight text-gray-900', valueClass)}>{value}</p>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}

function FindingRow({ finding }: { finding: AdvisorFinding }) {
  const tone: BadgeTone =
    finding.severity === 'CRITICAL' ? 'danger' : finding.severity === 'WARNING' ? 'warning' : 'info';
  const ToneIcon =
    finding.severity === 'CRITICAL' || finding.severity === 'WARNING' ? AlertTriangle : Sparkles;
  const toneText =
    finding.severity === 'CRITICAL'
      ? 'text-danger'
      : finding.severity === 'WARNING'
        ? 'text-warning'
        : 'text-primary';
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50', toneText)} aria-hidden="true">
        <ToneIcon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-semibold text-gray-900">{finding.title}</h3>
          {finding.metric && <Badge tone={tone} className="px-1.5 py-0 text-[10px]">{finding.metric}</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-muted">{finding.message}</p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { user, membership, business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const tz = business.timezone || 'Asia/Karachi';
  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { period } = getCurrentMonthPeriods();

  const [
    products,
    todaySalesAggregate,
    todayProfitAggregate,
    customerAggregate,
    recentSales,
    advisorData,
    salesTrend,
    udhaar,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true, sku: true, unit: true, currentStock: true, minStockThreshold: true },
    }),
    prisma.sale.aggregate({
      where: {
        businessId: business.id,
        status: 'COMPLETED',
        saleDate: { gte: todayStart },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId: business.id,
          status: 'COMPLETED',
          saleDate: { gte: todayStart },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.customer.aggregate({
      where: { businessId: business.id, isActive: true },
      _sum: { outstanding: true },
      _count: { id: true },
    }),
    prisma.sale.findMany({
      where: { businessId: business.id },
      include: {
        customer: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    generateAdvisorFindings(business.id, tz),
    getSalesTrend(business.id, 7, tz),
    getUdhaarAnalytics(business.id, period, tz),
  ]);

  const outOfStockProducts = products.filter((p) => p.currentStock <= 0);
  const lowStockProducts = products.filter(
    (p) => p.currentStock > 0 && p.minStockThreshold !== null && p.currentStock <= p.minStockThreshold,
  );
  const attentionProducts = [...outOfStockProducts, ...lowStockProducts]
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, 6);
  const attentionCount = outOfStockProducts.length + lowStockProducts.length;

  const todaySalesTotal = Number(todaySalesAggregate._sum.total || 0);
  const todaySalesCount = todaySalesAggregate._count.id;
  const todayProfitTotal = Number(todayProfitAggregate._sum.lineProfit || 0);
  const totalUdhaar = Number(customerAggregate._sum.outstanding || 0);
  const activeCustomerCount = customerAggregate._count.id;

  const { healthScore, findings, summaryText } = advisorData;
  const topFindings = findings.slice(0, 2);

  const trendRevenueTotal = salesTrend.reduce((sum, d) => sum + d.revenue, 0);
  const trendChartData = salesTrend.map((d) => ({
    label: WEEKDAYS[new Date(`${d.date}T00:00:00`).getDay()],
    value1: Math.round(d.revenue),
    value2: Math.round(d.profit),
  }));

  const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/dashboard/pos', label: 'New Sale', icon: ShoppingCart },
    { href: '/dashboard/products/new', label: 'Add Product', icon: PackagePlus },
    { href: '/dashboard/purchases/new', label: 'New Purchase', icon: Truck },
    { href: '/dashboard/customers', label: 'Add Customer', icon: UserPlus },
    ...(isOwnerOrManager ? [{ href: '/dashboard/expenses/new', label: 'Record Expense', icon: Banknote }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Here's what's happening at ${business.name} today.`}
        actions={
          <>
            <Link href="/dashboard/reports" className={buttonClasses('outline', 'sm')}>
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
              Reports
            </Link>
            <Link href="/dashboard/pos" className={buttonClasses('primary', 'sm')}>
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              POS Terminal
            </Link>
          </>
        }
      />

      {/* KPI snapshot */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Today's Sales"
            value={fmt(todaySalesTotal)}
            sub={`${todaySalesCount} ${todaySalesCount === 1 ? 'order' : 'orders'} processed today`}
            icon={ShoppingCart}
            accent="bg-primary-soft text-primary"
          />
          <Kpi
            label="Today's Profit"
            value={fmt(todayProfitTotal)}
            sub={
              todaySalesTotal > 0
                ? `${((todayProfitTotal / todaySalesTotal) * 100).toFixed(1)}% realized margin`
                : 'Realized net margin'
            }
            icon={TrendingUp}
            accent="bg-success-soft text-success"
            valueClass="text-success"
          />
          <Kpi
            label="Outstanding Udhaar"
            value={fmt(totalUdhaar)}
            sub={
              totalUdhaar > 0
                ? `Across ${activeCustomerCount} ${activeCustomerCount === 1 ? 'customer' : 'customers'}`
                : 'No pending receivables'
            }
            icon={Users}
            accent="bg-warning-soft text-warning"
            valueClass={totalUdhaar > 0 ? 'text-warning' : undefined}
          />
          <Kpi
            label="Stock Alerts"
            value={String(attentionCount)}
            sub={
              attentionCount > 0
                ? `${outOfStockProducts.length} out of stock · ${lowStockProducts.length} low`
                : 'Inventory looks healthy'
            }
            icon={Package}
            accent={attentionCount > 0 ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}
            valueClass={attentionCount > 0 ? 'text-danger' : undefined}
          />
        </div>
      </Card>

      {/* Sales trend + business health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Sales Trend"
            description="Revenue and profit — last 7 days"
            action={{ href: '/dashboard/reports', label: 'View reports' }}
          />
          <CardContent>
            {trendRevenueTotal === 0 ? (
              <EmptyState
                compact
                icon={BarChart3}
                title="Not enough data to show trends yet"
                description="Your daily revenue and profit chart will appear here once completed orders are recorded."
              />
            ) : (
              <div role="img" aria-label={`Bar chart of daily revenue and profit for the last 7 days. Total revenue ${fmt(trendRevenueTotal)}.`}>
                <SimpleBarChart data={trendChartData} label1="Revenue" label2="Profit" height={200} color1="#2563eb" color2="#16a34a" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <SectionHeader
            title="Business Health"
            action={{ href: '/dashboard/advisor', label: 'Open advisor' }}
          />
          <CardContent className="space-y-4">
            <HealthGauge score={healthScore.score} grade={healthScore.grade} />
            <p className="text-center text-xs text-muted">{summaryText}</p>
            {topFindings.length > 0 && (
              <div className="divide-y divide-border border-t border-border">
                {topFindings.map((finding) => (
                  <FindingRow key={finding.id} finding={finding} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent sales + attention required */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <SectionHeader
            title="Recent Sales"
            description="Latest invoices across all channels"
            action={{ href: '/dashboard/sales', label: 'View all sales' }}
          />
          {recentSales.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No sales recorded yet"
              description="Use the POS Terminal to create your first invoice."
              action={
                <Link href="/dashboard/pos" className={buttonClasses('primary', 'sm')}>
                  Open POS Terminal
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentSales.map((sale) => {
                const total = Number(sale.total);
                const paid = Number(sale.paidAmount);
                const isCompleted = sale.status === 'COMPLETED';
                const paymentLabel = !isCompleted
                  ? sale.status === 'REFUNDED'
                    ? 'Refunded'
                    : 'Cancelled'
                  : paid >= total
                    ? 'Paid'
                    : paid > 0
                      ? 'Partial'
                      : 'Udhaar';
                const paymentTone: BadgeTone = !isCompleted
                  ? 'danger'
                  : paid >= total
                    ? 'success'
                    : paid > 0
                      ? 'warning'
                      : 'info';
                return (
                  <li key={sale.id}>
                    <Link
                      href={`/dashboard/sales/${sale.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-gray-900">{sale.invoiceNumber}</p>
                        <p className="truncate text-xs text-muted">
                          {sale.customer ? sale.customer.name : 'Walk-in'} · {sale.items.length}{' '}
                          {sale.items.length === 1 ? 'item' : 'items'} · {new Date(sale.saleDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-right">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{fmt(total)}</p>
                        </div>
                        <Badge tone={paymentTone}>{paymentLabel}</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <SectionHeader
            title="Attention Required"
            description="Products needing restock"
            action={{ href: '/dashboard/inventory', label: 'View inventory' }}
          />
          {attentionProducts.length === 0 ? (
            <EmptyState
              compact
              icon={CheckCircle2}
              title="Inventory looks healthy"
              description="No products currently need attention."
            />
          ) : (
            <ul className="divide-y divide-border">
              {attentionProducts.map((product) => {
                const isOut = product.currentStock <= 0;
                return (
                  <li key={product.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                      <p className="text-xs text-muted">
                        {isOut ? 'No stock left' : `Threshold: ${product.minStockThreshold} ${product.unit}`}
                      </p>
                    </div>
                    <span className={badgeClasses(isOut ? 'danger' : 'warning', 'shrink-0')}>
                      {isOut ? 'Out of stock' : `${product.currentStock} left`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Customer snapshot + quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Customer Udhaar"
            description={`${period.label} credit activity`}
            action={{ href: '/dashboard/customers', label: 'View customers' }}
          />
          {activeCustomerCount === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title="No customers added yet"
              description="Add customers to track udhaar balances and payment history."
              action={
                <Link href="/dashboard/customers" className={buttonClasses('outline', 'sm')}>
                  Add a customer
                </Link>
              }
            />
          ) : (
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-card border border-border bg-gray-50/60 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                    Collected this month
                  </dt>
                  <dd className="mt-1 text-lg font-bold text-gray-900">{fmt(udhaar.paymentsReceivedThisPeriod)}</dd>
                </div>
                <div className="rounded-card border border-border bg-gray-50/60 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    New credit this month
                  </dt>
                  <dd className="mt-1 text-lg font-bold text-gray-900">{fmt(udhaar.newCreditThisPeriod)}</dd>
                </div>
                <div className="rounded-card border border-border bg-gray-50/60 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                    Outstanding balance
                  </dt>
                  <dd className={cn('mt-1 text-lg font-bold', totalUdhaar > 0 ? 'text-warning' : 'text-gray-900')}>
                    {fmt(udhaar.totalOutstanding)}
                  </dd>
                </div>
              </dl>

              {udhaar.topDebtors.length === 0 ? (
                <div className="flex items-center gap-2 rounded-card border border-success/25 bg-success-soft px-4 py-3 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  No outstanding udhaar balances. All customer accounts are clear.
                </div>
              ) : (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    Highest outstanding
                  </h3>
                  <ul className="divide-y divide-border">
                    {udhaar.topDebtors.slice(0, 3).map((debtor) => (
                      <li key={debtor.customerId} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                            aria-hidden="true"
                          >
                            {debtor.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate text-sm font-medium text-gray-900">{debtor.name}</span>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-warning">{fmt(debtor.outstanding)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <Card>
          <SectionHeader title="Quick Actions" description="Common daily tasks" />
          <CardContent className="p-3">
            <ul className="space-y-1">
              {quickActions.map((action) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    <action.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    {action.label}
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="pb-2 text-center text-xs text-muted">
        Signed in as {user.name || 'user'} · {membership.role} at {business.name}
      </p>
    </div>
  );
}
