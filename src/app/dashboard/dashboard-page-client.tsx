'use client';

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
import { SimpleBarChart } from '@/components/charts/bar-chart';
import { HealthGauge } from '@/components/charts/health-gauge';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, badgeClasses, type BadgeTone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';

export type OverviewFinding = {
  id: string;
  severity: string;
  title: string;
  message: string;
  metric: string | null;
};

export type OverviewAttentionProduct = {
  id: string;
  name: string;
  currentStock: number;
  minStockThreshold: number | null;
  unit: string;
};

export type OverviewRecentSale = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  itemsCount: number;
  saleDate: string;
  total: number;
  paidAmount: number;
  status: string;
};

export type OverviewTrendDay = {
  date: string;
  revenue: number;
  profit: number;
};

export type OverviewDebtor = {
  customerId: string;
  name: string;
  outstanding: number;
};

export type DashboardOverviewProps = {
  businessName: string;
  userName: string | null;
  role: string;
  isOwnerOrManager: boolean;
  todaySalesTotal: number;
  todaySalesCount: number;
  todayProfitTotal: number;
  totalUdhaar: number;
  activeCustomerCount: number;
  attentionCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  attentionProducts: OverviewAttentionProduct[];
  healthScore: number;
  healthGrade: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'CRITICAL';
  summaryText: string;
  topFindings: OverviewFinding[];
  trendData: OverviewTrendDay[];
  trendRevenueTotal: number;
  recentSales: OverviewRecentSale[];
  udhaarCollectedThisPeriod: number;
  udhaarNewCreditThisPeriod: number;
  udhaarTotalOutstanding: number;
  topDebtors: OverviewDebtor[];
};

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
          <ArrowRight className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
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

function FindingRow({ finding, tm }: { finding: OverviewFinding; tm: (m: string | null | undefined) => string }) {
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
          <h3 className="text-sm font-semibold text-gray-900">{tm(finding.title)}</h3>
          {finding.metric && <Badge tone={tone} className="px-1.5 py-0 text-[10px]">{tm(finding.metric)}</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-muted">{tm(finding.message)}</p>
      </div>
    </div>
  );
}

export function DashboardPageClient({
  businessName,
  userName,
  role,
  isOwnerOrManager,
  todaySalesTotal,
  todaySalesCount,
  todayProfitTotal,
  totalUdhaar,
  activeCustomerCount,
  attentionCount,
  outOfStockCount,
  lowStockCount,
  attentionProducts,
  healthScore,
  healthGrade,
  summaryText,
  topFindings,
  trendData,
  trendRevenueTotal,
  recentSales,
  udhaarCollectedThisPeriod,
  udhaarNewCreditThisPeriod,
  udhaarTotalOutstanding,
  topDebtors,
}: DashboardOverviewProps) {
  const { language, t, tm, formatCurrency } = useTranslation();
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const money = (n: number) => formatCurrency(Math.round(n));

  const roleLabels: Record<string, string> = {
    OWNER: t('overview.roleOwner'),
    MANAGER: t('overview.roleManager'),
    CASHIER: t('overview.roleCashier'),
    EMPLOYEE: t('overview.roleEmployee'),
  };

  const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/dashboard/pos', label: t('overview.actionNewSale'), icon: ShoppingCart },
    { href: '/dashboard/products/new', label: t('overview.actionAddProduct'), icon: PackagePlus },
    { href: '/dashboard/purchases/new', label: t('overview.actionNewPurchase'), icon: Truck },
    { href: '/dashboard/customers', label: t('overview.actionAddCustomer'), icon: UserPlus },
    ...(isOwnerOrManager ? [{ href: '/dashboard/expenses/new', label: t('overview.actionRecordExpense'), icon: Banknote }] : []),
  ];

  const trendChartData = trendData.map((d) => ({
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short' }),
    value1: Math.round(d.revenue),
    value2: Math.round(d.profit),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t('overview.title')}
        description={t('overview.headerDescription', { name: businessName })}
        actions={
          <>
            <Link href="/dashboard/reports" className={buttonClasses('outline', 'sm')}>
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('overview.reports')}
            </Link>
            <Link href="/dashboard/pos" className={buttonClasses('primary', 'sm')}>
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              {t('overview.posTerminal')}
            </Link>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label={t('overview.todaySales')}
            value={money(todaySalesTotal)}
            sub={t(todaySalesCount === 1 ? 'overview.ordersProcessedOne' : 'overview.ordersProcessedOther', { count: todaySalesCount })}
            icon={ShoppingCart}
            accent="bg-primary-soft text-primary"
          />
          <Kpi
            label={t('overview.todayProfit')}
            value={money(todayProfitTotal)}
            sub={
              todaySalesTotal > 0
                ? t('overview.realizedMargin', { margin: ((todayProfitTotal / todaySalesTotal) * 100).toFixed(1) })
                : t('overview.realizedNetMargin')
            }
            icon={TrendingUp}
            accent="bg-success-soft text-success"
            valueClass="text-success"
          />
          <Kpi
            label={t('overview.outstandingUdhaar')}
            value={money(totalUdhaar)}
            sub={
              totalUdhaar > 0
                ? t(activeCustomerCount === 1 ? 'overview.acrossCustomersOne' : 'overview.acrossCustomersOther', { count: activeCustomerCount })
                : t('overview.noPendingReceivables')
            }
            icon={Users}
            accent="bg-warning-soft text-warning"
            valueClass={totalUdhaar > 0 ? 'text-warning' : undefined}
          />
          <Kpi
            label={t('overview.stockAlerts')}
            value={String(attentionCount)}
            sub={
              attentionCount > 0
                ? t('overview.stockAlertsBreakdown', { out: outOfStockCount, low: lowStockCount })
                : t('overview.inventoryHealthy')
            }
            icon={Package}
            accent={attentionCount > 0 ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}
            valueClass={attentionCount > 0 ? 'text-danger' : undefined}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader
            title={t('overview.salesTrend')}
            description={t('overview.salesTrendDescription')}
            action={{ href: '/dashboard/reports', label: t('overview.viewReports') }}
          />
          <CardContent>
            {trendRevenueTotal === 0 ? (
              <EmptyState
                compact
                icon={BarChart3}
                title={t('overview.noTrendDataTitle')}
                description={t('overview.noTrendDataDescription')}
              />
            ) : (
              <div role="img" aria-label={t('overview.trendChartAria', { total: money(trendRevenueTotal) })}>
                <SimpleBarChart data={trendChartData} label1={t('dashboard.revenue')} label2={t('overview.profitLegend')} height={200} color1="#aff33e" color2="#16a34a" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <SectionHeader
            title={t('overview.businessHealth')}
            action={{ href: '/dashboard/advisor', label: t('overview.openAdvisor') }}
          />
          <CardContent className="space-y-4">
            <HealthGauge score={healthScore} grade={healthGrade} />
            <p className="text-center text-xs text-muted">{tm(summaryText)}</p>
            {topFindings.length > 0 && (
              <div className="divide-y divide-border border-t border-border">
                {topFindings.map((finding) => (
                  <FindingRow key={finding.id} finding={finding} tm={tm} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <SectionHeader
            title={t('overview.recentSales')}
            description={t('overview.recentSalesDescription')}
            action={{ href: '/dashboard/sales', label: t('overview.viewAllSales') }}
          />
          {recentSales.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t('overview.noSalesTitle')}
              description={t('overview.noSalesDescription')}
              action={
                <Link href="/dashboard/pos" className={buttonClasses('primary', 'sm')}>
                  {t('overview.openPosTerminal')}
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentSales.map((sale) => {
                const total = sale.total;
                const paid = sale.paidAmount;
                const isCompleted = sale.status === 'COMPLETED';
                const paymentLabel = !isCompleted
                  ? sale.status === 'REFUNDED'
                    ? t('overview.paymentRefunded')
                    : t('overview.paymentCancelled')
                  : paid >= total
                    ? t('overview.paymentPaid')
                    : paid > 0
                      ? t('overview.paymentPartial')
                      : t('overview.paymentUdhaar');
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
                          {sale.customerName ?? t('overview.walkIn')} ·{' '}
                          {t(sale.itemsCount === 1 ? 'overview.itemCountOne' : 'overview.itemCountOther', { count: sale.itemsCount })} ·{' '}
                          {new Date(sale.saleDate).toLocaleDateString(locale)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-end">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{money(total)}</p>
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
            title={t('overview.attentionRequired')}
            description={t('overview.attentionDescription')}
            action={{ href: '/dashboard/inventory', label: t('overview.viewInventory') }}
          />
          {attentionProducts.length === 0 ? (
            <EmptyState
              compact
              icon={CheckCircle2}
              title={t('overview.inventoryHealthy')}
              description={t('overview.noAttentionDescription')}
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
                        {isOut
                          ? t('overview.noStockLeft')
                          : t('overview.threshold', { count: product.minStockThreshold ?? 0, unit: product.unit })}
                      </p>
                    </div>
                    <span className={badgeClasses(isOut ? 'danger' : 'warning', 'shrink-0')}>
                      {isOut ? t('overview.outOfStock') : t('overview.stockLeft', { count: product.currentStock })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader
            title={t('overview.customerUdhaar')}
            description={t('overview.creditActivity', { period: t('common.thisMonth') })}
            action={{ href: '/dashboard/customers', label: t('overview.viewCustomers') }}
          />
          {activeCustomerCount === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title={t('overview.noCustomersTitle')}
              description={t('overview.noCustomersDescription')}
              action={
                <Link href="/dashboard/customers" className={buttonClasses('outline', 'sm')}>
                  {t('overview.addCustomerCta')}
                </Link>
              }
            />
          ) : (
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-card border border-border bg-gray-50/60 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('overview.collectedThisMonth')}
                  </dt>
                  <dd className="mt-1 text-lg font-bold text-gray-900">{money(udhaarCollectedThisPeriod)}</dd>
                </div>
                <div className="rounded-card border border-border bg-gray-50/60 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('overview.newCreditThisMonth')}
                  </dt>
                  <dd className="mt-1 text-lg font-bold text-gray-900">{money(udhaarNewCreditThisPeriod)}</dd>
                </div>
                <div className="rounded-card border border-border bg-gray-50/60 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('overview.outstandingBalance')}
                  </dt>
                  <dd className={cn('mt-1 text-lg font-bold', totalUdhaar > 0 ? 'text-warning' : 'text-gray-900')}>
                    {money(udhaarTotalOutstanding)}
                  </dd>
                </div>
              </dl>

              {topDebtors.length === 0 ? (
                <div className="flex items-center gap-2 rounded-card border border-success/25 bg-success-soft px-4 py-3 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('overview.noOutstandingBalances')}
                </div>
              ) : (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    {t('overview.highestOutstanding')}
                  </h3>
                  <ul className="divide-y divide-border">
                    {topDebtors.slice(0, 3).map((debtor) => (
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
                        <span className="shrink-0 text-sm font-bold text-warning">{money(debtor.outstanding)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <Card>
          <SectionHeader title={t('dashboard.quickActions')} description={t('overview.quickActionsDescription')} />
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
                    <ArrowUpRight className="ms-auto h-3.5 w-3.5 rtl-flip text-gray-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="pb-2 text-center text-xs text-muted">
        {t('overview.signedInAs', {
          name: userName || t('overview.userFallback'),
          role: roleLabels[role] ?? role,
          business: businessName,
        })}
      </p>
    </div>
  );
}
