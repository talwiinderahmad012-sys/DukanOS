'use client';

import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus,
  CreditCard, Tag, ArrowLeft,
} from 'lucide-react';
import { SalesAnalyticsFilter } from '@/components/analytics/sales-analytics-filter';
import { ExportButton } from '@/components/analytics/export-button';
import type { DateRangePreset } from '@/components/analytics/date-range-filter';
import { useTranslation } from '@/lib/i18n/language-context';

export type GrowthBadgeData = {
  status: 'UP' | 'DOWN' | 'FLAT' | 'NEW' | 'NO_BASELINE';
  formatted: string;
};

export type KpiData = { current: number; previous: number; growth: GrowthBadgeData };

export type SalesAnalyticsProps = {
  preset: DateRangePreset;
  startISO: string;
  endISO: string;
  periodKey: string;
  exportData: Record<string, unknown>[];
  kpis: {
    totalSales: KpiData;
    grossProfit: KpiData;
    netProfit: KpiData;
    avgOrderValue: KpiData;
    orderCount: KpiData;
  };
  paymentMethods: { method: string; count: number; revenue: number; percentage: number }[];
  categories: { categoryId: string; categoryName: string; revenue: number; profit: number; orders: number; percentage: number }[];
  topProducts: {
    productId: string;
    name: string;
    sku?: string | null;
    unit: string;
    quantitySold: number;
    revenue: number;
    profit: number;
    profitMarginPercent: number;
  }[];
};

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  CASH: 'sales.payCash',
  CARD: 'sales.payCard',
  BANK_TRANSFER: 'sales.payBankTransfer',
  MOBILE_WALLET: 'sales.payMobileWallet',
  CREDIT: 'sales.payCredit',
};

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

function GrowthBadge({ growth }: { growth: GrowthBadgeData }) {
  const { t } = useTranslation();
  const { status, formatted } = growth;
  if (status === 'NO_BASELINE') return <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t('common.new')}</span>;
  if (status === 'UP')   return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><TrendingUp className="w-3 h-3" aria-hidden="true"/>{formatted}</span>;
  if (status === 'DOWN') return <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><TrendingDown className="w-3 h-3" aria-hidden="true"/>{formatted}</span>;
  return <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Minus className="w-3 h-3" aria-hidden="true"/>{formatted}</span>;
}

export function SalesAnalyticsClient({
  preset,
  startISO,
  endISO,
  periodKey,
  exportData,
  kpis,
  paymentMethods,
  categories,
  topProducts,
}: SalesAnalyticsProps) {
  const { t, tm, formatCurrency, formatNumber } = useTranslation();

  const label = t(periodLabelKey(periodKey));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600 rtl-flip" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('analytics.sales.title')}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{t('analytics.sales.subtitle', { period: label })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SalesAnalyticsFilter
            preset={preset}
            startISO={startISO}
            endISO={endISO}
          />
          <ExportButton data={exportData} filename="sales-analytics" label={t('analytics.sales.exportCsv')} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.totalSales')}</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.totalSales.current)}</p>
          <GrowthBadge growth={kpis.totalSales.growth} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.grossProfit')}</p>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(kpis.grossProfit.current)}</p>
          <GrowthBadge growth={kpis.grossProfit.growth} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.avgOrderValue')}</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.avgOrderValue.current)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.shared.ordersCount', { count: formatNumber(kpis.orderCount.current) })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.netProfit')}</p>
          <p className="text-xl font-bold text-violet-700">{formatCurrency(kpis.netProfit.current)}</p>
          <GrowthBadge growth={kpis.netProfit.growth} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h2 className="font-bold text-gray-900">{t('analytics.sales.salesByPaymentMethod')}</h2>
          {paymentMethods.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.sales.noSalesDataPeriod')}</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <div key={pm.method} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-gray-900">{PAYMENT_METHOD_LABEL_KEYS[pm.method] ? t(PAYMENT_METHOD_LABEL_KEYS[pm.method]) : tm(pm.method)}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(pm.revenue)}</span>
                    <span className="text-[10px] text-gray-400 ms-2">{t('analytics.shared.ordersPct', { count: formatNumber(pm.count), pct: pm.percentage })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h2 className="font-bold text-gray-900">{t('analytics.sales.salesByCategory')}</h2>
          {categories.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.sales.noSalesDataPeriod')}</p>
          ) : (
            <div className="space-y-2">
              {categories.slice(0, 10).map(cat => (
                <div key={cat.categoryId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-gray-900">{cat.categoryName}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(cat.revenue)}</span>
                    <span className="text-[10px] text-gray-400 ms-2">{t('analytics.shared.ordersPct', { count: formatNumber(cat.orders), pct: cat.percentage })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <h2 className="font-bold text-gray-900">{t('analytics.sales.topProductsByRevenue')}</h2>
        {topProducts.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.shared.noSalesPeriod')}</p>
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
                  <th className="text-end py-2 ps-2">{t('analytics.shared.marginHeader')}</th>
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
                    <td className="py-2 ps-2 text-end">
                      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${p.profitMarginPercent >= 20 ? 'bg-emerald-100 text-emerald-700' : p.profitMarginPercent >= 10 ? 'bg-blue-100 text-gray-950' : 'bg-gray-100 text-gray-600'}`}>
                        {p.profitMarginPercent.toFixed(1)}%
                      </span>
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
