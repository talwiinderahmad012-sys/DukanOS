'use client';

import Link from 'next/link';
import {
  ArrowLeft, AlertCircle,
  Clock,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type InventoryAnalyticsProps = {
  inventory: {
    totalUnits: number;
    totalValue: number;
    lowStockValue: number;
    deadStockValue: number;
    valuationMethod: string;
  };
  lowStock: { outOfStock: number; critical: number; low: number; healthy: number };
  slowMoving: { productId: string; name: string; currentStock: number; stockValue: number; daysSinceLastSale: number }[];
  deadStock: { productId: string; name: string; currentStock: number; inventoryValue: number; daysSinceLastSale: number }[];
};

export function InventoryAnalyticsClient({
  inventory,
  lowStock,
  slowMoving,
  deadStock,
}: InventoryAnalyticsProps) {
  const { t, tm, formatCurrency, formatNumber } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600 rtl-flip" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.inventory.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('analytics.inventory.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.totalUnits')}</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(inventory.totalUnits)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.inventory.acrossAllProducts')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.totalValue')}</p>
          <p className="text-xl font-bold text-gray-950">{formatCurrency(inventory.totalValue)}</p>
          <p className="text-[10px] text-gray-400">{inventory.valuationMethod === 'LATEST_COST' ? t('analytics.inventory.latestCost') : tm(inventory.valuationMethod)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.deadStockValue')}</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(inventory.deadStockValue)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.inventory.ninetyDaysNoSales')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.lowStockValue')}</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(inventory.lowStockValue)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.inventory.belowThreshold')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{formatNumber(lowStock.outOfStock)}</p>
          <p className="text-xs font-semibold text-red-600 mt-0.5">{t('analytics.shared.outOfStock')}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{formatNumber(lowStock.critical)}</p>
          <p className="text-xs font-semibold text-amber-600 mt-0.5">{t('analytics.shared.criticalStock')}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{formatNumber(lowStock.low)}</p>
          <p className="text-xs font-semibold text-yellow-600 mt-0.5">{t('analytics.shared.lowStock')}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{formatNumber(lowStock.healthy)}</p>
          <p className="text-xs font-semibold text-emerald-600 mt-0.5">{t('analytics.shared.healthyStock')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
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
            <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
            <h2 className="font-bold text-gray-900">{t('analytics.shared.deadStockTitle')}</h2>
          </div>
          {deadStock.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.shared.noDeadStock')}</p>
          ) : (
            <div className="space-y-2">
              {deadStock.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{t('analytics.shared.unitsValue', { count: formatNumber(p.currentStock), value: formatCurrency(p.inventoryValue) })}</p>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{t('analytics.shared.daysCount', { days: p.daysSinceLastSale })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
