'use client';

import Link from 'next/link';
import { ArrowLeft, Receipt, Tag } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type ExpensesAnalyticsProps = {
  periodKey: string;
  data: {
    totalCurrent: number;
    totalPrevious: number;
    totalGrowth: { status: string; percentage: number | null };
    categories: { category: string; amount: number; percentage: number }[];
    expenseCount: number;
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

export function ExpensesAnalyticsClient({ periodKey, data }: ExpensesAnalyticsProps) {
  const { t, formatCurrency, formatNumber } = useTranslation();

  const label = t(periodLabelKey(periodKey));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600 rtl-flip" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.expenses.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('analytics.expenses.subtitle', { period: label })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.expenses.totalExpenses')}</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(data.totalCurrent)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.shared.previousValue', { value: formatCurrency(data.totalPrevious) })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.shared.growth')}</p>
          <p className="text-xl font-bold text-gray-900">
            {data.totalGrowth.status === 'UP' ? '+' : ''}
            {data.totalGrowth.percentage?.toFixed(1) || '0.0'}%
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.expenses.categoriesCard')}</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(data.categories.length)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.expenses.activeCategories')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">{t('analytics.expenses.transactionsCard')}</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(data.expenseCount)}</p>
          <p className="text-[10px] text-gray-400">{t('analytics.expenses.expenseRecords')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-orange-600" aria-hidden="true" />
          <h2 className="font-bold text-gray-900">{t('analytics.expenses.byCategoryTitle')}</h2>
        </div>
        {data.categories.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">{t('analytics.expenses.noExpensesPeriod')}</p>
        ) : (
          <div className="space-y-2">
            {data.categories.map(cat => (
              <div key={cat.category} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-xs font-semibold text-gray-900">{cat.category}</span>
                </div>
                <div className="text-end">
                  <span className="text-xs font-bold text-gray-900">{formatCurrency(cat.amount)}</span>
                  <span className="text-[10px] text-gray-400 ms-2">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
