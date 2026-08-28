'use client';

import Link from 'next/link';
import {
  ArrowLeft, TrendingUp, AlertTriangle, Minus,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type ProductsAnalyticsProps = {
  periodKey: string;
  topProducts: {
    productId: string;
    name: string;
    unit: string;
    quantitySold: number;
    revenue: number;
    profitMarginPercent: number;
  }[];
  bestProfit: {
    productId: string;
    name: string;
    revenue: number;
    profit: number;
    profitMarginPercent: number;
  }[];
  slowMoving: { productId: string; name: string; currentStock: number; stockValue: number; daysSinceLastSale: number }[];
  declining: { productId: string; name: string; previousRevenue: number; currentRevenue: number; declinePercent: number | null }[];
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

export function ProductsAnalyticsClient({
  periodKey,
  topProducts,
  bestProfit,
  slowMoving,
  declining,
}: ProductsAnalyticsProps) {
  const { t, formatCurrency, formatNumber } = useTranslation();

  const label = t(periodLabelKey(periodKey));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600 rtl-flip" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('analytics.products.title')}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{label}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.products.topProductsCard')}</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(topProducts.length)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.products.rankedByUnits')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.products.bestProfitCard')}</p>
          <p className="text-xl font-bold text-emerald-700">{formatNumber(bestProfit.length)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.products.rankedByMargin')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.products.slowMovingCard')}</p>
          <p className="text-xl font-bold text-amber-600">{formatNumber(slowMoving.length)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.products.noSales30Card')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.products.decliningCard')}</p>
          <p className="text-xl font-bold text-red-600">{formatNumber(declining.length)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.products.salesDownCard')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-900" aria-hidden="true" />
            <h2 className="font-bold text-gray-900">{t('analytics.products.topSellingTitle')}</h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.shared.noSalesPeriod')}</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p) => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{t('analytics.products.unitsSoldRevenue', { count: formatNumber(p.quantitySold), unit: p.unit, value: formatCurrency(p.revenue) })}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{t('analytics.shared.pctMargin', { pct: p.profitMarginPercent.toFixed(1) })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <h2 className="font-bold text-gray-900">{t('analytics.products.bestProfitTitle')}</h2>
          </div>
          {bestProfit.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.shared.noSalesPeriod')}</p>
          ) : (
            <div className="space-y-2">
              {bestProfit.map((p) => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{t('analytics.products.profitRevenue', { value: formatCurrency(p.profit), revenue: formatCurrency(p.revenue) })}</p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-950 bg-primary-soft px-2 py-0.5 rounded-full">{t('analytics.shared.pctMargin', { pct: p.profitMarginPercent.toFixed(1) })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <h2 className="font-bold text-gray-900">{t('analytics.shared.slowMovingTitle')}</h2>
          </div>
          {slowMoving.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.shared.noSlowMoving')}</p>
          ) : (
            <div className="space-y-2">
              {slowMoving.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{t('analytics.shared.unitsValue', { count: formatNumber(p.currentStock), value: formatCurrency(p.stockValue) })}</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{t('analytics.shared.daysIdle', { days: p.daysSinceLastSale })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Minus className="w-4 h-4 text-red-600" aria-hidden="true" />
            <h2 className="font-bold text-gray-900">{t('analytics.products.decliningTitle')}</h2>
            <span className="text-[10px] text-gray-400 font-normal">{t('analytics.products.decliningNote')}</span>
          </div>
          {declining.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.products.noDeclining')}</p>
          ) : (
            <div className="space-y-2">
              {declining.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{formatCurrency(p.previousRevenue)} → {formatCurrency(p.currentRevenue)}</p>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    {p.declinePercent !== null ? `-${p.declinePercent.toFixed(1)}%` : t('common.dash')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
