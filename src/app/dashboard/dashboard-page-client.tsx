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
import { Badge, badgeClasses, type BadgeTone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonClasses } from '@/components/ui/button';
import { TiltCard } from '@/components/ui/TiltCard';
import { motion, useReducedMotion } from 'framer-motion';
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

// ── Glass panel wrapper for content sections ──────────────────────────────────
function GlassSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('surface-glass rounded-2xl overflow-hidden shadow-lg shadow-black/5', className)}
    >
      {children}
    </motion.div>
  );
}

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
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 px-5 py-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-lime-400 dark:hover:text-lime-300 transition-colors"
          data-sound="nav-click"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
        </Link>
      )}
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
      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/50 dark:bg-white/10', toneText)} aria-hidden="true">
        <ToneIcon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{tm(finding.title)}</h3>
          {finding.metric && <Badge tone={tone} className="px-1.5 py-0 text-[10px]">{tm(finding.metric)}</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{tm(finding.message)}</p>
      </div>
    </div>
  );
}

// Stagger animation for lists
const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

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
  const shouldReduceMotion = useReducedMotion();

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
            <Link href="/dashboard/reports" className={buttonClasses('outline', 'sm')} data-sound="nav-click">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('overview.reports')}
            </Link>
            <Link href="/dashboard/pos" className={buttonClasses('primary', 'sm')} data-sound="primary">
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              {t('overview.posTerminal')}
            </Link>
          </>
        }
      />

      {/* ── KPI stat cards ── */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
        <TiltCard
          label={t('overview.todaySales')}
          numericValue={todaySalesTotal}
          formatter={money}
          sub={t(todaySalesCount === 1 ? 'overview.ordersProcessedOne' : 'overview.ordersProcessedOther', { count: todaySalesCount })}
          icon={ShoppingCart}
          accent="bg-lime-500/20 text-lime-700 dark:text-lime-300"
          glowColor="rgba(175,243,62,0.40)"
        />
        <TiltCard
          label={t('overview.todayProfit')}
          numericValue={todayProfitTotal}
          formatter={money}
          sub={
            todaySalesTotal > 0
              ? t('overview.realizedMargin', { margin: ((todayProfitTotal / todaySalesTotal) * 100).toFixed(1) })
              : t('overview.realizedNetMargin')
          }
          icon={TrendingUp}
          accent="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          glowColor="rgba(16,185,129,0.38)"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <TiltCard
          label={t('overview.outstandingUdhaar')}
          numericValue={totalUdhaar}
          formatter={money}
          sub={
            totalUdhaar > 0
              ? t(activeCustomerCount === 1 ? 'overview.acrossCustomersOne' : 'overview.acrossCustomersOther', { count: activeCustomerCount })
              : t('overview.noPendingReceivables')
          }
          icon={Users}
          accent="bg-amber-500/20 text-amber-700 dark:text-amber-300"
          glowColor="rgba(245,158,11,0.38)"
          valueClass={totalUdhaar > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
        />
        <TiltCard
          label={t('overview.stockAlerts')}
          numericValue={attentionCount}
          sub={
            attentionCount > 0
              ? t('overview.stockAlertsBreakdown', { out: outOfStockCount, low: lowStockCount })
              : t('overview.inventoryHealthy')
          }
          icon={Package}
          accent={attentionCount > 0 ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-teal-500/20 text-teal-700 dark:text-teal-300'}
          glowColor={attentionCount > 0 ? 'rgba(244,63,94,0.38)' : 'rgba(20,184,166,0.38)'}
          valueClass={attentionCount > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
        />
      </motion.div>

      {/* ── Sales Trend + Business Health ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassSection className="lg:col-span-2">
          <SectionHeader
            title={t('overview.salesTrend')}
            description={t('overview.salesTrendDescription')}
            action={{ href: '/dashboard/reports', label: t('overview.viewReports') }}
          />
          <div className="p-5">
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
          </div>
        </GlassSection>

        <GlassSection>
          <SectionHeader
            title={t('overview.businessHealth')}
            action={{ href: '/dashboard/advisor', label: t('overview.openAdvisor') }}
          />
          <div className="space-y-4 p-5">
            <HealthGauge score={healthScore} grade={healthGrade} />
            <p className="text-center text-xs text-gray-500 dark:text-slate-400">{tm(summaryText)}</p>
            {topFindings.length > 0 && (
              <div className="divide-y divide-black/5 dark:divide-white/10 border-t border-black/5 dark:border-white/10">
                {topFindings.map((finding) => (
                  <FindingRow key={finding.id} finding={finding} tm={tm} />
                ))}
              </div>
            )}
          </div>
        </GlassSection>
      </div>

      {/* ── Recent Sales + Attention Required ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassSection className="overflow-hidden lg:col-span-2">
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
                <Link href="/dashboard/pos" className={buttonClasses('primary', 'sm')} data-sound="primary">
                  {t('overview.openPosTerminal')}
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {recentSales.map((sale, i) => {
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
                  <motion.li
                    key={sale.id}
                    custom={i}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Link
                      href={`/dashboard/sales/${sale.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-white/45 dark:hover:bg-white/5"
                      data-sound="nav-click"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-gray-900 dark:text-white">{sale.invoiceNumber}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                          {sale.customerName ?? t('overview.walkIn')} ·{' '}
                          {t(sale.itemsCount === 1 ? 'overview.itemCountOne' : 'overview.itemCountOther', { count: sale.itemsCount })} ·{' '}
                          {new Date(sale.saleDate).toLocaleDateString(locale)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-end">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{money(total)}</p>
                        </div>
                        <Badge tone={paymentTone}>{paymentLabel}</Badge>
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </GlassSection>

        <GlassSection className="overflow-hidden">
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
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {attentionProducts.map((product, i) => {
                const isOut = product.currentStock <= 0;
                return (
                  <motion.li
                    key={product.id}
                    custom={i}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isOut
                          ? t('overview.noStockLeft')
                          : t('overview.threshold', { count: product.minStockThreshold ?? 0, unit: product.unit })}
                      </p>
                    </div>
                    <span className={badgeClasses(isOut ? 'danger' : 'warning', 'shrink-0')}>
                      {isOut ? t('overview.outOfStock') : t('overview.stockLeft', { count: product.currentStock })}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </GlassSection>
      </div>

      {/* ── Customer Udhaar + Quick Actions ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassSection className="lg:col-span-2">
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
                <Link href="/dashboard/customers" className={buttonClasses('outline', 'sm')} data-sound="nav-click">
                  {t('overview.addCustomerCta')}
                </Link>
              }
            />
          ) : (
            <div className="space-y-4 p-5">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Wallet, label: t('overview.collectedThisMonth'), value: money(udhaarCollectedThisPeriod) },
                  { icon: Users, label: t('overview.newCreditThisMonth'), value: money(udhaarNewCreditThisPeriod) },
                  { icon: Receipt, label: t('overview.outstandingBalance'), value: money(udhaarTotalOutstanding), highlight: totalUdhaar > 0 },
                ].map(({ icon: Icon, label, value, highlight }) => (
                  <div key={label} className="surface-glass rounded-xl border border-white/60 dark:border-white/10 p-3 shadow-xs">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {label}
                    </dt>
                    <dd className={cn('mt-1 text-lg font-bold', highlight ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white')}>{value}</dd>
                  </div>
                ))}
              </dl>

              {topDebtors.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success-soft/50 px-4 py-3 text-sm font-medium text-success backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('overview.noOutstandingBalances')}
                </div>
              ) : (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('overview.highestOutstanding')}
                  </h3>
                  <ul className="divide-y divide-black/5 dark:divide-white/10">
                    {topDebtors.slice(0, 3).map((debtor, i) => (
                      <motion.li
                        key={debtor.customerId}
                        custom={i}
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                            aria-hidden="true"
                          >
                            {debtor.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{debtor.name}</span>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-amber-600 dark:text-amber-400">{money(debtor.outstanding)}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </GlassSection>

        <GlassSection>
          <SectionHeader title={t('dashboard.quickActions')} description={t('overview.quickActionsDescription')} />
          <div className="p-3">
            <ul className="space-y-1">
              {quickActions.map((action, i) => (
                <motion.li
                  key={action.href}
                  custom={i}
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href={action.href}
                    className="group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-150 hover:bg-white/50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white hover:translate-x-1 rtl:hover:-translate-x-1"
                    data-sound="nav-click"
                  >
                    <action.icon className="h-5 w-5 text-primary transition-transform duration-150 group-hover:scale-110" aria-hidden="true" />
                    {action.label}
                    <ArrowUpRight className="ms-auto h-3.5 w-3.5 rtl-flip text-slate-400 group-hover:text-primary transition-colors" aria-hidden="true" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>
        </GlassSection>
      </div>

      <p className="pb-2 text-center text-xs text-gray-500 dark:text-slate-500">
        {t('overview.signedInAs', {
          name: userName || t('overview.userFallback'),
          role: roleLabels[role] ?? role,
          business: businessName,
        })}
      </p>
    </div>
  );
}
