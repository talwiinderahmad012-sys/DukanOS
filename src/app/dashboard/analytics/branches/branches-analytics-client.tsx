'use client';

import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type BranchesAnalyticsProps = {
  periodKey: string;
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

export function BranchesAnalyticsClient({ periodKey, branches }: BranchesAnalyticsProps) {
  const { t, formatCurrency } = useTranslation();

  const label = t(periodLabelKey(periodKey));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600 rtl-flip" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.branches.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('analytics.branches.subtitle', { period: label, count: branches.length })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(b => (
          <div key={b.branchId} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-gray-900" aria-hidden="true" />
              <div>
                <p className="font-bold text-gray-900 text-sm">{b.branchName}</p>
                <p className="text-[10px] text-gray-400 font-mono">{b.branchCode}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.revenue')}</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(b.revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.grossProfit')}</p>
                <p className="text-sm font-bold text-emerald-700">{formatCurrency(b.grossProfit)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.expenses')}</p>
                <p className="text-sm font-bold text-orange-600">{formatCurrency(b.expenses)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.netProfit')}</p>
                <p className={`text-sm font-bold ${b.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(b.netProfit)}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
              <span>{t('analytics.shared.ordersCount', { count: b.orderCount })}</span>
              <span>{b.revenue > 0 ? t('analytics.shared.pctMargin', { pct: Math.round((b.grossProfit / b.revenue) * 100) }) : t('analytics.shared.zeroMargin')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
