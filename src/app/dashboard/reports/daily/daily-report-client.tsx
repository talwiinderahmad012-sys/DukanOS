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

export type DailySummaryData = {
  grossRevenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  ordersCount: number;
  creditGiven: number;
  paymentsReceived: number;
  purchaseSpend: number;
};

export type GrowthData = { status: string; formatted: string };

export type HourPoint = { hour: number; revenue: number; orders: number };

export type DailyTopProduct = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  quantity: number;
  revenue: number;
  profit: number;
};

export type DailySaleRow = {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  total: number;
  paidAmount: number;
  customerName: string | null;
};

export function DailyReportClient({
  date,
  branchId,
  branches,
  summary,
  growth,
  hours,
  topProducts,
  sales,
}: {
  date: string;
  branchId?: string;
  branches: BranchOption[];
  summary: DailySummaryData;
  growth: GrowthData;
  hours: HourPoint[];
  topProducts: DailyTopProduct[];
  sales: DailySaleRow[];
}) {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const reportDateLabel = new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const growthValue = growth.status === 'NO_BASELINE' ? t('reports.growthNew') : growth.formatted;

  const chartData = hours.map((h) => ({
    label: new Date(2000, 0, 1, h.hour).toLocaleTimeString(locale, { hour: 'numeric' }),
    value1: h.revenue,
    value2: h.orders * 100,
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
          <span className="text-gray-900 font-semibold">{t('reports.dailyReport')}</span>
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
            defaultValue={date}
            aria-label={t('common.date')}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {branchId && <input type="hidden" name="branchId" value={branchId} />}
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold rounded-lg transition-colors"
          >
            {t('common.apply')}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
            {t('reports.dailyFinancialAudit')}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {t('reports.reportForDate', { date: reportDateLabel })}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {t('reports.calculatedFromOrders', { count: formatNumber(summary.ordersCount) })}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            growth.status === 'UP' ? 'bg-green-100 text-green-700' : growth.status === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {growth.status === 'UP' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] text-gray-400 font-semibold block">{t('reports.vsYesterday')}</span>
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
          <span className="text-xs font-semibold text-gray-500 uppercase">{t('reports.grossSales')}</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(summary.grossRevenue)}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{t('reports.ordersCaption', { count: formatNumber(summary.ordersCount) })}</p>
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
          <span className="text-xs font-semibold text-red-700 uppercase">{t('reports.expenses')}</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">
            {formatCurrency(summary.expenses)}
          </h3>
          <p className="text-xs text-red-500 mt-1">{t('reports.dailyOperationalCosts')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-950 uppercase">{t('reports.netProfitLabel')}</span>
          <h3 className="text-2xl font-bold text-gray-950 mt-1">
            {formatCurrency(summary.netProfit)}
          </h3>
          <p className="text-xs text-gray-800 mt-1">{t('reports.afterExpenses')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">{t('reports.newCustomerCredit')}</span>
            <p className="text-lg font-bold text-orange-600 mt-0.5">{formatCurrency(summary.creditGiven)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">{t('reports.debtPaymentsReceived')}</span>
            <p className="text-lg font-bold text-green-600 mt-0.5">{formatCurrency(summary.paymentsReceived)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">{t('reports.procurementSpend')}</span>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(summary.purchaseSpend)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">{t('reports.hourlySalesDistribution')}</h3>
        <SimpleBarChart
          data={chartData}
          height={200}
          label1={t('reports.salesRevenueLegend')}
          label2={t('reports.orderVolumeLegend')}
          color1="#aff33e"
          color2="#93c5fd"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">{t('reports.topProductsOnDate', { date })}</h3>
        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">{t('reports.noItemsSoldOnDate')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-4 py-3 font-medium">{t('common.product')}</th>
                  <th className="px-4 py-3 font-medium text-center">{t('reports.quantitySold')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('reports.revenue')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('reports.realizedProfit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.name}
                      {item.sku && <span className="block text-xs text-gray-400 font-mono">{t('reports.fields.sku')}: {item.sku}</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">
                      {formatNumber(item.quantity)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold text-gray-900">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="px-4 py-3 text-end font-bold text-green-600">
                      {formatCurrency(item.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">{t('reports.transactionsLog')} ({formatNumber(sales.length)})</h3>
        {sales.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">{t('reports.noTransactionsOnDate')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-4 py-3 font-medium">{t('reports.invoiceNumber')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.time')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.customer')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('common.total')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('common.paid')}</th>
                  <th className="px-4 py-3 font-medium text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{s.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(s.saleDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{s.customerName ?? t('reports.walkIn')}</td>
                    <td className="px-4 py-3 text-end font-bold text-gray-900">{formatCurrency(s.total)}</td>
                    <td className="px-4 py-3 text-end text-green-600 font-medium">{formatCurrency(s.paidAmount)}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      <Link href={`/dashboard/sales/${s.id}`} className="text-gray-900 hover:underline">
                        {t('reports.viewInvoice')} <span className="inline-block rtl-flip" aria-hidden="true">&rarr;</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
