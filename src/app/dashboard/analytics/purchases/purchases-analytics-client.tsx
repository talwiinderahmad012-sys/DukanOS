'use client';

import Link from 'next/link';
import { ArrowLeft, Truck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type PurchaseGrowth = {
  status: 'UP' | 'DOWN' | 'FLAT' | 'NEW' | 'NO_BASELINE';
  percentage: number | null;
  formatted: string;
};

export type KpiData = { current: number; previous: number; growth: PurchaseGrowth };

export type PurchasesAnalyticsProps = {
  periodKey: string;
  data: {
    totalSpend: KpiData;
    orderCount: KpiData;
    topSuppliers: {
      supplierId: string;
      name: string;
      totalSpend: number;
      purchaseCount: number;
      lastPurchaseDate: string | null;
    }[];
  };
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

export function PurchasesAnalyticsClient({ periodKey, data }: PurchasesAnalyticsProps) {
  const { t, language, formatCurrency, formatNumber } = useTranslation();

  const label = t(periodLabelKey(periodKey));
  const comparisonLabel = t('analytics.shared.previousPeriod');
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600 rtl-flip" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('analytics.purchases.title')}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{t('analytics.main.periodVsSub', { period: label, comparison: comparisonLabel })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.purchases.totalSpend')}</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(data.totalSpend.current)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.shared.previousValue', { value: formatCurrency(data.totalSpend.previous) })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.purchases.purchaseOrders')}</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(data.orderCount.current)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.shared.previousValue', { value: formatNumber(data.orderCount.previous) })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.avgOrderValue')}</p>
          <p className="text-xl font-bold text-gray-900">
            {data.orderCount.current > 0 ? formatCurrency(data.totalSpend.current / data.orderCount.current) : formatCurrency(0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.growth')}</p>
          <p className="text-xl font-bold text-gray-900">
            {data.totalSpend.growth.status === 'UP' ? '+' : ''}
            {data.totalSpend.growth.percentage?.toFixed(1) || '0.0'}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-gray-900" aria-hidden="true" />
          <h2 className="font-bold text-gray-900">{t('analytics.purchases.topSuppliersTitle')}</h2>
        </div>
        {data.topSuppliers.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.purchases.noPurchaseData')}</p>
        ) : (
          <div className="space-y-2">
            {data.topSuppliers.slice(0, 15).map(s => (
              <div key={s.supplierId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-semibold text-gray-900">{s.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {t('analytics.shared.ordersLastDate', { count: formatNumber(s.purchaseCount), date: s.lastPurchaseDate ? new Date(s.lastPurchaseDate).toLocaleDateString(locale) : t('common.dash') })}
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-900">{formatCurrency(s.totalSpend)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
