'use client';

import Link from 'next/link';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  PieChart,
  ShoppingBag,
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';
import { useTranslation } from '@/lib/i18n/language-context';

export type BranchOption = { id: string; name: string };

export type MonthlySummaryData = {
  grossRevenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  ordersCount: number;
};

export type GrowthData = { status: string; formatted: string };

export type DailyPoint = { day: number; revenue: number; profit: number; expenses: number };

export type ExpenseCategoryData = { category: string; amount: number; percentage: number };

export type TopProductData = {
  productId: string;
  name: string;
  unit: string;
  currentStock: number;
  quantitySold: number;
  revenue: number;
};

export function MonthlyReportClient({
  year,
  month,
  branchId,
  branches,
  summary,
  growth,
  daily,
  expenseCategories,
  topProducts,
}: {
  year: number;
  month: number;
  branchId?: string;
  branches: BranchOption[];
  summary: MonthlySummaryData;
  growth: GrowthData;
  daily: DailyPoint[];
  expenseCategories: ExpenseCategoryData[];
  topProducts: TopProductData[];
}) {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const monthName = (monthIndex: number): string =>
    new Date(2000, monthIndex, 1).toLocaleDateString(locale, { month: 'long' });

  const currentMonthName = monthName(month - 1);

  const growthValue = growth.status === 'NO_BASELINE' ? t('reports.growthNew') : growth.formatted;

  const chartData = daily.map((d) => ({
    label: `${d.day}`,
    value1: d.revenue,
    value2: d.profit,
    value3: d.expenses,
  }));

  const grossMarginPercent =
    summary.grossRevenue > 0
      ? Math.round((summary.grossProfit / summary.grossRevenue) * 100)
      : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/reports" className="hover:text-gray-900 transition-colors">
            {t('reports.reportsLabel')}
          </Link>
          <ChevronRight className="w-4 h-4 rtl-flip text-gray-400" />
          <span className="text-gray-900 font-semibold">{t('reports.monthlyReport')}</span>
        </div>

        <form method="GET" className="flex items-center gap-2">
          <select
            name="branchId"
            defaultValue={branchId || 'ALL'}
            aria-label={t('reports.allBranches')}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">{t('reports.allBranches')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            name="month"
            defaultValue={month}
            aria-label={t('reports.month')}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Array.from({ length: 12 }, (_, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {monthName(idx)}
              </option>
            ))}
          </select>

          <input
            type="number"
            name="year"
            defaultValue={year}
            min="2020"
            max="2030"
            aria-label={t('reports.yearLabel')}
            className="w-24 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {branchId && <input type="hidden" name="branchId" value={branchId} />}

          <button
            type="submit"
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold rounded-lg transition-colors"
          >
            {t('common.filter')}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">
            {t('reports.monthlyFinancialStatement')}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {currentMonthName} {year}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {t('reports.monthlyReconciliationDesc')}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            growth.status === 'UP' ? 'bg-green-100 text-green-700' : growth.status === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {growth.status === 'UP' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] text-gray-400 font-semibold block">{t('reports.vsLastMonth')}</span>
            <span className={`text-sm font-bold ${
              growth.status === 'UP' ? 'text-green-700' : growth.status === 'DOWN' ? 'text-red-600' : 'text-gray-700'
            }`}>
              {t('reports.revenueGrowthCaption', { value: growthValue })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">{t('reports.grossRevenue')}</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(summary.grossRevenue)}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{t('reports.completedOrdersCaption', { count: formatNumber(summary.ordersCount) })}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase">{t('reports.grossProfit')}</span>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">
            {formatCurrency(summary.grossProfit)}
          </h3>
          <p className="text-xs text-emerald-600 mt-1">
            {summary.grossRevenue > 0 ? t('reports.marginValue', { value: grossMarginPercent }) : '0%'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-red-700 uppercase">{t('reports.monthlyExpenses')}</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">
            {formatCurrency(summary.expenses)}
          </h3>
          <p className="text-xs text-red-500 mt-1">{t('reports.operatingCosts')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-950 uppercase">{t('reports.netProfitLabel')}</span>
          <h3 className="text-2xl font-bold text-gray-950 mt-1">
            {formatCurrency(summary.netProfit)}
          </h3>
          <p className="text-xs text-gray-800 mt-1">{t('reports.finalBottomLine')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">{t('reports.dailyTrendsRange', { count: daily.length })}</h3>
        <SimpleBarChart
          data={chartData}
          height={240}
          label1={t('reports.revenue')}
          label2={t('reports.grossProfit')}
          label3={t('reports.expenses')}
          color1="#aff33e"
          color2="#16a34a"
          color3="#dc2626"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-red-600" /> {t('reports.expenseAllocation')}
            </h3>
            <span className="text-xs text-gray-400">{t('common.total')}: {formatCurrency(summary.expenses)}</span>
          </div>

          {expenseCategories.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">{t('reports.noExpensesThisMonth')}</div>
          ) : (
            <div className="divide-y divide-gray-100 text-sm">
              {expenseCategories.map((item) => (
                <div key={item.category} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.category}</p>
                    <div className="w-32 bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-red-500 h-full rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                    <span className="block text-xs text-gray-400">{t('reports.percentOfTotal', { value: item.percentage })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-gray-900" /> {t('reports.monthlyTopPerformers')}
            </h3>
            <span className="text-xs text-gray-400">{t('reports.byVelocity')}</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">{t('reports.noSalesRecorded')}</div>
          ) : (
            <div className="divide-y divide-gray-100 text-sm">
              {topProducts.map((p, idx) => (
                <div key={p.productId} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-soft text-gray-950 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{t('reports.stockCaption', { count: formatNumber(p.currentStock), unit: p.unit })}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="font-bold text-gray-900">{formatNumber(p.quantitySold)} {p.unit}</span>
                    <span className="block text-xs text-green-600">{formatCurrency(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
