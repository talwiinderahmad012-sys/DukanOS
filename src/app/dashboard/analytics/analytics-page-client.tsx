'use client';

import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus,
  ShoppingCart, DollarSign, Package,
  AlertCircle, BarChart3, Receipt, Layers,
  ArrowUpRight,
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';
import { useTranslation } from '@/lib/i18n/language-context';

export type GrowthBadgeData = {
  status: 'UP' | 'DOWN' | 'FLAT' | 'NEW' | 'NO_BASELINE';
  formatted: string;
};

export type KpiData = { current: number; previous: number; growth: GrowthBadgeData };

export type MainAnalyticsProps = {
  year: number;
  kpis: {
    totalSales: KpiData;
    grossProfit: KpiData;
    expenses: KpiData;
    netProfit: KpiData;
    totalPurchases: KpiData;
    outstandingUdhaar: { current: number };
    productsSold: KpiData;
    avgOrderValue: KpiData;
    orderCount: KpiData;
  };
  trendChart: { label: string; value1: number; value2: number }[];
  monthlyRows: {
    month: number;
    revenue: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    orders: number;
    avgOrderValue: number;
    growthPercent: number | null;
    growthStatus: string;
  }[];
  yearly: {
    current: { year: number; revenue: number; grossProfit: number; expenses: number; netProfit: number; orders: number; productsSold: number; newCustomers: number };
    previous: { year: number; revenue: number; grossProfit: number; expenses: number; netProfit: number; orders: number; productsSold: number; newCustomers: number };
    growth: {
      revenue: GrowthBadgeData;
      grossProfit: GrowthBadgeData;
      expenses: GrowthBadgeData;
      netProfit: GrowthBadgeData;
      orders: GrowthBadgeData;
      productsSold: GrowthBadgeData;
      newCustomers: GrowthBadgeData;
    };
  };
  topProducts: {
    productId: string;
    name: string;
    sku?: string | null;
    unit: string;
    currentStock: number;
    quantitySold: number;
    revenue: number;
    profit: number;
    profitMarginPercent: number;
  }[];
  slowProducts: { productId: string; name: string; currentStock: number; stockValue: number; daysSinceLastSale: number }[];
  deadStock: { productId: string; name: string; currentStock: number; inventoryValue: number; daysSinceLastSale: number }[];
  lowStock: { outOfStock: number; critical: number; low: number; healthy: number; total: number };
  topCustomers: { customerId: string; name: string; phone?: string | null; orderCount: number; totalSpent: number; outstanding: number }[];
  customerGrowth: { newThisMonth: number; growth: GrowthBadgeData };
  udhaar: {
    totalOutstanding: number;
    newCreditThisPeriod: number;
    paymentsReceivedThisPeriod: number;
    netChange: number;
    topDebtors: { customerId: string; name: string; outstanding: number }[];
  };
  purchaseAnalytics: {
    totalSpend: KpiData;
    orderCount: KpiData;
    topSuppliers: { supplierId: string; name: string; totalSpend: number; purchaseCount: number }[];
  };
  branches: {
    branchId: string;
    branchName: string;
    branchCode: string;
    revenue: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    orderCount: number;
  }[];
  inventoryValuation: { totalUnits: number; totalValue: number; lowStockValue: number; deadStockValue: number; note: string };
  health: {
    overallScore: number;
    status: string;
    dimensions: { name: string; score: number; status: string; reason: string }[];
  };
  insights: {
    id: string;
    priority: string;
    category: string;
    title: string;
    message: string;
    actionUrl?: string;
    dataPoint?: string;
  }[];
  payroll: { totalPayroll: number; paidPayroll: number; pendingPayroll: number; employeeCount: number; leaveUsage: number };
};

const HEALTH_STATUS_KEYS: Record<string, string> = {
  Excellent: 'analytics.health.statusExcellent',
  Healthy: 'analytics.health.statusHealthy',
  'Needs Attention': 'analytics.health.statusNeedsAttention',
  Critical: 'analytics.health.statusCritical',
};

const HEALTH_DIM_KEYS: Record<string, string> = {
  'Sales Growth': 'analytics.health.dimSalesGrowth',
  Profitability: 'analytics.health.dimProfitability',
  'Inventory Health': 'analytics.health.dimInventoryHealth',
  'Udhaar Health': 'analytics.health.dimUdhaarHealth',
  'Expense Control': 'analytics.health.dimExpenseControl',
  'Customer Growth': 'analytics.health.dimCustomerGrowth',
};

const INSIGHT_CATEGORY_KEYS: Record<string, string> = {
  SALES: 'analytics.insight.catSales',
  INVENTORY: 'analytics.insight.catInventory',
  UDHAAR: 'analytics.insight.catUdhaar',
  EXPENSES: 'analytics.insight.catExpenses',
  CUSTOMERS: 'analytics.insight.catCustomers',
  GROWTH: 'analytics.insight.catGrowth',
};

const INSIGHT_PRIORITY_KEYS: Record<string, string> = {
  HIGH: 'common.high',
  MEDIUM: 'common.medium',
  LOW: 'common.low',
};

function GrowthBadge({ growth }: { growth: GrowthBadgeData }) {
  const { t } = useTranslation();
  const { status, formatted } = growth;
  if (status === 'NO_BASELINE') return <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t('common.new')}</span>;
  if (status === 'UP')   return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><TrendingUp className="w-3 h-3" aria-hidden="true"/>{formatted}</span>;
  if (status === 'DOWN') return <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><TrendingDown className="w-3 h-3" aria-hidden="true"/>{formatted}</span>;
  return <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Minus className="w-3 h-3" aria-hidden="true"/>{formatted}</span>;
}

function KPICard({ label, value, growth, sub, icon: Icon, accent }: { label: string; value: string; growth?: GrowthBadgeData; sub?: string; icon: any; accent?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent || 'bg-primary-soft text-gray-900'}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        {growth && <GrowthBadge growth={growth} />}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function AnalyticsPageClient({
  year,
  kpis,
  trendChart,
  monthlyRows,
  yearly,
  topProducts,
  slowProducts,
  deadStock,
  lowStock,
  topCustomers,
  customerGrowth,
  udhaar,
  purchaseAnalytics,
  branches,
  inventoryValuation,
  health,
  insights,
  payroll,
}: MainAnalyticsProps) {
  const { t, tm, language, formatCurrency, formatNumber } = useTranslation();

  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const monthShort = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString(locale, { month: 'short' });

  const periodLabel = t('common.thisMonth');
  const comparisonLabel = t('common.lastMonth');

  const monthlyChartData = monthlyRows.map(m => ({
    label: monthShort(m.month),
    value1: m.revenue,
    value2: m.grossProfit,
    value3: m.expenses,
  }));

  const healthColor =
    health.status === 'Excellent' ? 'text-emerald-600' :
    health.status === 'Healthy'   ? 'text-gray-900' :
    health.status === 'Needs Attention' ? 'text-amber-600' : 'text-red-600';

  const healthBg =
    health.status === 'Excellent' ? 'bg-emerald-50 border-emerald-200' :
    health.status === 'Healthy'   ? 'bg-primary-soft border-blue-200' :
    health.status === 'Needs Attention' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  const insightPriorityColor = (p: string) =>
    p === 'HIGH' ? 'bg-red-100 text-red-700' :
    p === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-gray-950';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.main.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('analytics.main.subtitle', { period: periodLabel, comparison: comparisonLabel })}
          </p>
        </div>
        <Link
          href="/dashboard/growth"
          className="text-xs font-semibold text-gray-900 hover:underline flex items-center gap-1"
        >
          {t('analytics.main.growthReport')} <ArrowUpRight className="w-3.5 h-3.5 rtl-flip" aria-hidden="true" />
        </Link>
      </div>

      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('analytics.main.kpiHeading', { period: periodLabel })}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard label={t('analytics.shared.totalSales')}        value={formatCurrency(kpis.totalSales.current)}        growth={kpis.totalSales.growth}        sub={t('analytics.shared.prevValue', { value: formatCurrency(kpis.totalSales.previous) })}        icon={DollarSign}   accent="bg-primary-soft text-gray-900" />
          <KPICard label={t('analytics.shared.grossProfit')}       value={formatCurrency(kpis.grossProfit.current)}       growth={kpis.grossProfit.growth}       sub={t('analytics.shared.prevValue', { value: formatCurrency(kpis.grossProfit.previous) })}       icon={TrendingUp}   accent="bg-emerald-50 text-emerald-600" />
          <KPICard label={t('analytics.shared.expenses')}          value={formatCurrency(kpis.expenses.current)}          growth={kpis.expenses.growth}          sub={t('analytics.shared.prevValue', { value: formatCurrency(kpis.expenses.previous) })}          icon={Receipt}      accent="bg-orange-50 text-orange-600" />
          <KPICard label={t('analytics.shared.netProfit')}         value={formatCurrency(kpis.netProfit.current)}         growth={kpis.netProfit.growth}         sub={t('analytics.shared.prevValue', { value: formatCurrency(kpis.netProfit.previous) })}         icon={BarChart3}    accent="bg-violet-50 text-violet-600" />
          <KPICard label={t('analytics.main.totalPurchases')}      value={formatCurrency(kpis.totalPurchases.current)}    growth={kpis.totalPurchases.growth}    sub={t('analytics.shared.prevValue', { value: formatCurrency(kpis.totalPurchases.previous) })}    icon={Package}      accent="bg-cyan-50 text-cyan-600" />
          <KPICard label={t('analytics.main.outstandingUdhaar')}   value={formatCurrency(kpis.outstandingUdhaar.current)}                        sub={t('analytics.main.outstandingUdhaarSub')}                                       icon={AlertCircle}  accent="bg-rose-50 text-rose-600" />
          <KPICard label={t('analytics.main.productsSold')}        value={t('analytics.shared.unitsCount', { count: formatNumber(kpis.productsSold.current) })} growth={kpis.productsSold.growth} sub={t('analytics.shared.prevValue', { value: t('analytics.shared.unitsCount', { count: formatNumber(kpis.productsSold.previous) }) })} icon={Layers} accent="bg-indigo-50 text-indigo-600" />
          <KPICard label={t('analytics.shared.avgOrderValue')}     value={formatCurrency(kpis.avgOrderValue.current)}     growth={kpis.avgOrderValue.growth}     sub={t('analytics.main.ordersThisMonth', { count: formatNumber(kpis.orderCount.current) })}       icon={ShoppingCart} accent="bg-teal-50 text-teal-600" />
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900">{t('analytics.main.trendTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.trendSub')}</p>
          </div>
        </div>
        <SimpleBarChart data={trendChart} label1={t('analytics.shared.revenue')} label2={t('analytics.shared.grossProfit')} height={220} color1="#aff33e" color2="#16a34a" />
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">{t('analytics.main.monthlyGrowthTitle', { year })}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.monthlyGrowthSub')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-gray-500 font-semibold border-b border-gray-100">
                <th className="text-start py-2 pe-4">{t('analytics.main.monthHeader')}</th>
                <th className="text-end py-2 px-2">{t('analytics.main.salesHeader')}</th>
                <th className="text-end py-2 px-2">{t('analytics.shared.grossProfit')}</th>
                <th className="text-end py-2 px-2">{t('analytics.shared.expenses')}</th>
                <th className="text-end py-2 px-2">{t('analytics.shared.netProfit')}</th>
                <th className="text-end py-2 px-2">{t('analytics.shared.orders')}</th>
                <th className="text-end py-2 px-2">{t('analytics.main.avgOrderHeader')}</th>
                <th className="text-end py-2 ps-2">{t('analytics.shared.growth')}</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map(m => (
                <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pe-4 font-semibold text-gray-900">{monthShort(m.month)}</td>
                  <td className="py-2 px-2 text-end">{m.revenue > 0 ? formatCurrency(m.revenue) : <span className="text-gray-300">{t('common.dash')}</span>}</td>
                  <td className="py-2 px-2 text-end text-emerald-700">{m.grossProfit > 0 ? formatCurrency(m.grossProfit) : <span className="text-gray-300">{t('common.dash')}</span>}</td>
                  <td className="py-2 px-2 text-end text-orange-600">{m.expenses > 0 ? formatCurrency(m.expenses) : <span className="text-gray-300">{t('common.dash')}</span>}</td>
                  <td className={`py-2 px-2 text-end font-semibold ${m.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{m.revenue > 0 || m.expenses > 0 ? formatCurrency(m.netProfit) : <span className="text-gray-300">{t('common.dash')}</span>}</td>
                  <td className="py-2 px-2 text-end">{m.orders > 0 ? formatNumber(m.orders) : <span className="text-gray-300">{t('common.dash')}</span>}</td>
                  <td className="py-2 px-2 text-end">{m.avgOrderValue > 0 ? formatCurrency(m.avgOrderValue) : <span className="text-gray-300">{t('common.dash')}</span>}</td>
                  <td className="py-2 ps-2 text-end">
                    {m.month === 1 ? <span className="text-gray-400 text-[10px]">{t('common.dash')}</span> :
                     m.growthStatus === 'NO_BASELINE' ? <span className="text-[10px] text-gray-500">{t('common.new')}</span> :
                     m.growthStatus === 'UP' ? <span className="text-[10px] font-bold text-emerald-700">+{m.growthPercent?.toFixed(1)}%</span> :
                     m.growthStatus === 'DOWN' ? <span className="text-[10px] font-bold text-red-600">{m.growthPercent?.toFixed(1)}%</span> :
                     <span className="text-[10px] text-gray-500">0%</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3">{t('analytics.main.monthlyChartTitle')}</p>
          <SimpleBarChart data={monthlyChartData} label1={t('analytics.shared.revenue')} label2={t('analytics.shared.grossProfit')} label3={t('analytics.shared.expenses')} height={180} color1="#aff33e" color2="#16a34a" color3="#ef4444" />
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">{t('analytics.main.yearlyTitle')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.yearVs', { current: yearly.current.year, previous: yearly.previous.year })}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { key: 'revenue',      label: t('analytics.shared.revenue'),        cur: yearly.current.revenue,      prev: yearly.previous.revenue,      g: yearly.growth.revenue },
            { key: 'grossProfit',  label: t('analytics.shared.grossProfit'),    cur: yearly.current.grossProfit,  prev: yearly.previous.grossProfit,  g: yearly.growth.grossProfit },
            { key: 'expenses',     label: t('analytics.shared.expenses'),       cur: yearly.current.expenses,     prev: yearly.previous.expenses,     g: yearly.growth.expenses },
            { key: 'netProfit',    label: t('analytics.shared.netProfit'),      cur: yearly.current.netProfit,    prev: yearly.previous.netProfit,    g: yearly.growth.netProfit },
            { key: 'orders',       label: t('analytics.shared.orders'),         cur: yearly.current.orders,       prev: yearly.previous.orders,       g: yearly.growth.orders, isNum: true },
            { key: 'productsSold', label: t('analytics.main.productsSold'),     cur: yearly.current.productsSold, prev: yearly.previous.productsSold, g: yearly.growth.productsSold, isNum: true },
            { key: 'newCustomers', label: t('analytics.main.newCustomers'),     cur: yearly.current.newCustomers, prev: yearly.previous.newCustomers, g: yearly.growth.newCustomers, isNum: true },
          ] as { key: string; label: string; cur: number; prev: number; g: GrowthBadgeData; isNum?: boolean }[]).map(({ key, label, cur, prev, g, isNum }) => (
            <div key={key} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{isNum ? formatNumber(cur) : formatCurrency(cur)}</p>
              <p className="text-[10px] text-gray-400">{t('analytics.shared.prevValue', { value: isNum ? formatNumber(prev) : formatCurrency(prev) })}</p>
              <div className="mt-1"><GrowthBadge growth={g} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900">{t('analytics.main.topProductsTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.topProductsSub', { period: periodLabel })}</p>
          </div>
          <Link href="/dashboard/products" className="text-xs font-semibold text-gray-900 hover:underline">{t('analytics.main.allProductsLink')}</Link>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.main.noSalesThisMonth')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-gray-500 font-semibold border-b border-gray-100">
                  <th className="text-start py-2 pe-3">{t('analytics.shared.rankHeader')}</th>
                  <th className="text-start py-2 pe-3">{t('analytics.shared.productHeader')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.unitsSoldHeader')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.revenue')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.profitHeader')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.marginHeader')}</th>
                  <th className="text-end py-2 ps-2">{t('analytics.main.inStockHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pe-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="py-2 pe-3">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.sku && <p className="text-gray-400 font-mono text-[10px]">{p.sku}</p>}
                    </td>
                    <td className="py-2 px-2 text-end font-bold">{formatNumber(p.quantitySold)} {p.unit}</td>
                    <td className="py-2 px-2 text-end">{formatCurrency(p.revenue)}</td>
                    <td className="py-2 px-2 text-end text-emerald-700">{formatCurrency(p.profit)}</td>
                    <td className="py-2 px-2 text-end">
                      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${p.profitMarginPercent >= 20 ? 'bg-emerald-100 text-emerald-700' : p.profitMarginPercent >= 10 ? 'bg-blue-100 text-gray-950' : 'bg-gray-100 text-gray-600'}`}>
                        {p.profitMarginPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 ps-2 text-end">
                      <span className={p.currentStock <= 0 ? 'text-red-600 font-bold' : p.currentStock <= 5 ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                        {formatNumber(p.currentStock)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900">{t('analytics.shared.slowMovingTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.slowMovingSub')}</p>
          </div>
          {slowProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">{t('analytics.shared.noSlowMoving')}</p>
          ) : (
            <div className="space-y-2">
              {slowProducts.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{t('analytics.shared.unitsValue', { count: formatNumber(p.currentStock), value: formatCurrency(p.stockValue) })}</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{t('analytics.shared.daysIdle', { days: p.daysSinceLastSale })}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900">{t('analytics.shared.deadStockTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.deadStockSub')}</p>
          </div>
          {deadStock.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">{t('analytics.shared.noDeadStock')}</p>
          ) : (
            <div className="space-y-2">
              {deadStock.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{t('analytics.shared.unitsValue', { count: formatNumber(p.currentStock), value: formatCurrency(p.inventoryValue) })}</p>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{t('analytics.shared.daysCount', { days: p.daysSinceLastSale })}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
          <div>
            <h2 className="font-bold text-gray-900">{t('analytics.main.stockStatusTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.stockStatusSub', { count: formatNumber(lowStock.total) })}</p>
          </div>
          <Link href="/dashboard/inventory" className="text-xs font-semibold text-gray-900 hover:underline">{t('analytics.main.viewInventoryLink')}</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'outOfStock', label: t('analytics.shared.outOfStock'),   count: lowStock.outOfStock, color: 'bg-red-50 border-red-200',           textColor: 'text-red-700' },
            { key: 'critical',   label: t('analytics.shared.criticalStock'), count: lowStock.critical,   color: 'bg-amber-50 border-amber-200',       textColor: 'text-amber-700' },
            { key: 'low',        label: t('analytics.shared.lowStock'),      count: lowStock.low,        color: 'bg-yellow-50 border-yellow-200',     textColor: 'text-yellow-700' },
            { key: 'healthy',    label: t('analytics.shared.healthyStock'),  count: lowStock.healthy,    color: 'bg-emerald-50 border-emerald-200',   textColor: 'text-emerald-700' },
          ].map(({ key, label, count, color, textColor }) => (
            <div key={key} className={`p-4 rounded-2xl border ${color} text-center`}>
              <p className={`text-2xl font-bold ${textColor}`}>{formatNumber(count)}</p>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900">{t('analytics.main.topCustomersTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.topCustomersSub', { period: periodLabel })}</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-500">
            <span>{t('analytics.main.newThisMonthLabel')}: <strong className="text-gray-900">{formatNumber(customerGrowth.newThisMonth)}</strong></span>
            <GrowthBadge growth={customerGrowth.growth} />
          </div>
        </div>
        {topCustomers.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">{t('analytics.main.noCustomerPurchases')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="text-gray-500 font-semibold border-b border-gray-100">
                  <th className="text-start py-2 pe-3">{t('analytics.shared.rankHeader')}</th>
                  <th className="text-start py-2 pe-3">{t('analytics.shared.customerHeader')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.orders')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.totalSpent')}</th>
                  <th className="text-end py-2 ps-2">{t('analytics.shared.udhaarHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={c.customerId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pe-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="py-2 pe-3">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      {c.phone && <p className="text-gray-400 font-mono text-[10px]">{c.phone}</p>}
                    </td>
                    <td className="py-2 px-2 text-end">{formatNumber(c.orderCount)}</td>
                    <td className="py-2 px-2 text-end font-semibold">{formatCurrency(c.totalSpent)}</td>
                    <td className={`py-2 ps-2 text-end font-semibold ${c.outstanding > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                      {c.outstanding > 0 ? formatCurrency(c.outstanding) : t('common.dash')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">{t('analytics.main.udhaarAnalyticsTitle')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.creditActivitySub', { period: periodLabel })}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'totalOutstanding', label: t('analytics.main.totalOutstanding'), value: formatCurrency(udhaar.totalOutstanding),              color: 'text-rose-600' },
            { key: 'newCredit',        label: t('analytics.main.newCredit'),        value: formatCurrency(udhaar.newCreditThisPeriod),           color: 'text-amber-600' },
            { key: 'paymentsReceived', label: t('analytics.main.paymentsReceived'), value: formatCurrency(udhaar.paymentsReceivedThisPeriod),   color: 'text-emerald-600' },
            { key: 'netChange',        label: t('analytics.main.netChange'),        value: formatCurrency(udhaar.netChange),                    color: udhaar.netChange > 0 ? 'text-rose-600' : 'text-emerald-600' },
          ].map(({ key, label, value, color }) => (
            <div key={key} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        {udhaar.topDebtors.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t('analytics.shared.topOutstandingBalances')}</p>
            <div className="space-y-1">
              {udhaar.topDebtors.map(d => (
                <div key={d.customerId} className="flex items-center justify-between py-1.5 px-3 bg-rose-50/50 rounded-xl">
                  <span className="text-xs font-semibold text-gray-900">{d.name}</span>
                  <span className="text-xs font-bold text-rose-600">{formatCurrency(d.outstanding)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">{t('analytics.main.purchaseAnalyticsTitle')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.periodVsSub', { period: periodLabel, comparison: comparisonLabel })}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.main.totalSpend')}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(purchaseAnalytics.totalSpend.current)}</p>
            <div className="mt-1"><GrowthBadge growth={purchaseAnalytics.totalSpend.growth} /></div>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.main.purchaseOrders')}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatNumber(purchaseAnalytics.orderCount.current)}</p>
            <div className="mt-1"><GrowthBadge growth={purchaseAnalytics.orderCount.growth} /></div>
          </div>
        </div>
        {purchaseAnalytics.topSuppliers.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t('analytics.shared.topSuppliers')}</p>
            <div className="space-y-1">
              {purchaseAnalytics.topSuppliers.slice(0, 5).map(s => (
                <div key={s.supplierId} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-semibold text-gray-900">{s.name}</span>
                  <div className="text-end">
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(s.totalSpend)}</span>
                    <span className="text-[10px] text-gray-400 ms-2">{t('analytics.shared.ordersParen', { count: formatNumber(s.purchaseCount) })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {branches.length > 1 && (
        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900">{t('analytics.main.branchPerformanceTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.branchPerformanceSub', { count: formatNumber(branches.length) })}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-gray-500 font-semibold border-b border-gray-100">
                  <th className="text-start py-2 pe-3">{t('analytics.shared.branchHeader')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.revenue')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.grossProfit')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.expenses')}</th>
                  <th className="text-end py-2 px-2">{t('analytics.shared.netProfit')}</th>
                  <th className="text-end py-2 ps-2">{t('analytics.shared.orders')}</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.branchId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pe-3">
                      <p className="font-semibold text-gray-900">{b.branchName}</p>
                      <p className="text-gray-400 font-mono text-[10px]">{b.branchCode}</p>
                    </td>
                    <td className="py-2 px-2 text-end">{formatCurrency(b.revenue)}</td>
                    <td className="py-2 px-2 text-end text-emerald-700">{formatCurrency(b.grossProfit)}</td>
                    <td className="py-2 px-2 text-end text-orange-600">{formatCurrency(b.expenses)}</td>
                    <td className={`py-2 px-2 text-end font-semibold ${b.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(b.netProfit)}</td>
                    <td className="py-2 ps-2 text-end">{formatNumber(b.orderCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">{t('analytics.main.inventoryValuationTitle')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{tm(inventoryValuation.note)}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'totalUnits',      label: t('analytics.shared.totalUnits'),      value: formatNumber(inventoryValuation.totalUnits) },
            { key: 'totalValue',      label: t('analytics.shared.totalValue'),      value: formatCurrency(inventoryValuation.totalValue),  color: 'text-gray-950' },
            { key: 'lowStockValue',   label: t('analytics.shared.lowStockValue'),   value: formatCurrency(inventoryValuation.lowStockValue),  color: 'text-amber-600' },
            { key: 'deadStockValue',  label: t('analytics.shared.deadStockValue'),  value: formatCurrency(inventoryValuation.deadStockValue), color: 'text-red-600' },
          ].map(({ key, label, value, color }) => (
            <div key={key} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`rounded-3xl border p-6 space-y-5 ${healthBg}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-bold text-gray-900">{t('analytics.main.healthScoreTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.healthScoreSub')}</p>
          </div>
          <div className="text-end">
            <span className={`text-4xl font-bold ${healthColor}`}>{formatNumber(health.overallScore)}</span>
            <span className="text-gray-400 text-lg">/100</span>
            <p className={`text-sm font-bold ${healthColor} mt-0.5`}>{HEALTH_STATUS_KEYS[health.status] ? t(HEALTH_STATUS_KEYS[health.status]) : tm(health.status)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {health.dimensions.map(d => (
            <div key={d.name} className="bg-white/70 rounded-2xl p-4 border border-white/50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-800">{HEALTH_DIM_KEYS[d.name] ? t(HEALTH_DIM_KEYS[d.name]) : tm(d.name)}</p>
                <span className={`text-xs font-bold ${d.status === 'excellent' ? 'text-emerald-600' : d.status === 'healthy' ? 'text-gray-900' : d.status === 'needs_attention' ? 'text-amber-600' : 'text-red-600'}`}>{formatNumber(d.score)}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${d.status === 'excellent' ? 'bg-emerald-500' : d.status === 'healthy' ? 'bg-primary-soft0' : d.status === 'needs_attention' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${d.score}%` }} />
              </div>
              <p className="text-[10px] text-gray-500">{tm(d.reason)}</p>
            </div>
          ))}
        </div>
      </section>

      {insights.length > 0 && (
        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900">{t('analytics.main.insightsTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.insightsSub')}</p>
          </div>
          <div className="space-y-3">
            {insights.map(ins => (
              <div key={ins.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${insightPriorityColor(ins.priority)}`}>{INSIGHT_PRIORITY_KEYS[ins.priority] ? t(INSIGHT_PRIORITY_KEYS[ins.priority]) : tm(ins.priority)}</span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">{INSIGHT_CATEGORY_KEYS[ins.category] ? t(INSIGHT_CATEGORY_KEYS[ins.category]) : tm(ins.category)}</span>
                  {ins.dataPoint && <span className="text-[10px] font-mono text-gray-400 ms-auto">{tm(ins.dataPoint)}</span>}
                </div>
                <p className="text-xs font-bold text-gray-900">{tm(ins.title)}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{tm(ins.message)}</p>
                {ins.actionUrl && (
                  <Link href={ins.actionUrl} className="text-[10px] font-semibold text-gray-900 hover:underline">
                    {t('analytics.main.takeAction')}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">{t('analytics.main.payrollTitle')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('analytics.main.payrollSub', { period: periodLabel })}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.main.employees')}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatNumber(payroll.employeeCount)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.main.totalPayroll')}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(payroll.totalPayroll)}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase">{t('analytics.main.paidPayroll')}</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(payroll.paidPayroll)}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-700 uppercase">{t('analytics.main.pendingPayroll')}</p>
            <p className="text-lg font-bold text-amber-700 mt-1">{formatCurrency(payroll.pendingPayroll)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.main.leaves')}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatNumber(payroll.leaveUsage)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
