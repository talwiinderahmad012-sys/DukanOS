'use client';

import Link from 'next/link';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';
import { useTranslation } from '@/lib/i18n/language-context';

export type BranchOption = { id: string; name: string };

export type WeeklySummaryData = {
  grossRevenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  ordersCount: number;
};

export type GrowthData = { status: string; formatted: string };

export type WeeklyDayRow = {
  dateStr: string;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  orders: number;
};

export function WeeklyReportClient({
  weekStart,
  weekEnd,
  branchId,
  branches,
  summary,
  growth,
  days,
}: {
  weekStart: string;
  weekEnd: string;
  branchId?: string;
  branches: BranchOption[];
  summary: WeeklySummaryData;
  growth: GrowthData;
  days: WeeklyDayRow[];
}) {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const dayName = (dateStr: string): string =>
    new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' });

  const weekLabel = `${new Date(`${weekStart}T12:00:00`).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })} – ${new Date(`${weekEnd}T12:00:00`).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  const growthValue = growth.status === 'NO_BASELINE' ? t('reports.growthNew') : growth.formatted;

  const chartData = days.map((d) => ({
    label: `${dayName(d.dateStr)} (${d.dateStr.slice(8)})`,
    value1: d.revenue,
    value2: d.grossProfit,
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
          <span className="text-gray-900 font-semibold">{t('reports.weeklyReport')}</span>
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
          <input
            type="date"
            name="date"
            defaultValue={weekStart}
            aria-label={t('common.date')}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {branchId && <input type="hidden" name="branchId" value={branchId} />}
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold rounded-lg transition-colors"
          >
            {t('reports.applyWeek')}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            {t('reports.weeklyPerformanceAudit')}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {t('reports.weekOf', { range: weekLabel })}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {t('reports.weekAggregationDesc')}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            growth.status === 'UP' ? 'bg-green-100 text-green-700' : growth.status === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {growth.status === 'UP' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] text-gray-400 font-semibold block">{t('reports.vsLastWeek')}</span>
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
          <span className="text-xs font-semibold text-gray-500 uppercase">{t('reports.weeklyRevenue')}</span>
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
          <span className="text-xs font-semibold text-red-700 uppercase">{t('reports.weeklyExpenses')}</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">
            {formatCurrency(summary.expenses)}
          </h3>
          <p className="text-xs text-red-500 mt-1">{t('reports.storeOperations')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-950 uppercase">{t('reports.netProfitLabel')}</span>
          <h3 className="text-2xl font-bold text-gray-950 mt-1">
            {formatCurrency(summary.netProfit)}
          </h3>
          <p className="text-xs text-gray-800 mt-1">{t('reports.grossMinusExpenses')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">{t('reports.dayByDayBreakdown')}</h3>
        <SimpleBarChart
          data={chartData}
          height={220}
          label1={t('reports.revenue')}
          label2={t('reports.grossProfit')}
          label3={t('reports.expenses')}
          color1="#aff33e"
          color2="#16a34a"
          color3="#dc2626"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 text-base">{t('reports.dailySummaryTable')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-5 py-3.5 font-medium">{t('reports.day')}</th>
                <th className="px-5 py-3.5 font-medium">{t('common.date')}</th>
                <th className="px-5 py-3.5 font-medium text-center">{t('reports.orders')}</th>
                <th className="px-5 py-3.5 font-medium text-end">{t('reports.revenue')}</th>
                <th className="px-5 py-3.5 font-medium text-end">{t('reports.grossProfit')}</th>
                <th className="px-5 py-3.5 font-medium text-end">{t('reports.expenses')}</th>
                <th className="px-5 py-3.5 font-medium text-end">{t('reports.netProfitLabel')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {days.map((d) => (
                <tr key={d.dateStr} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{dayName(d.dateStr)}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">{d.dateStr}</td>
                  <td className="px-5 py-3.5 text-center font-medium text-gray-700">{formatNumber(d.orders)}</td>
                  <td className="px-5 py-3.5 text-end font-semibold text-gray-900">
                    {formatCurrency(d.revenue)}
                  </td>
                  <td className="px-5 py-3.5 text-end text-emerald-700 font-medium">
                    {formatCurrency(d.grossProfit)}
                  </td>
                  <td className="px-5 py-3.5 text-end text-red-700 font-medium">
                    {formatCurrency(d.expenses)}
                  </td>
                  <td className="px-5 py-3.5 text-end font-bold text-gray-950">
                    {formatCurrency(d.netProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
