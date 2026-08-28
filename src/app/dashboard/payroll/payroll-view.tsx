'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { PayrollList, type PayrollListItem } from './payroll-list';

export function PayrollView({ payrolls }: { payrolls: PayrollListItem[] }) {
  const { t, formatNumber } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('payroll.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('payroll.subtitle')}
          </p>
        </div>

        <Link
          href="/dashboard/payroll/new"
          className="bg-primary hover:bg-primary-hover text-on-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" /> {t('payroll.createPeriod')}
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">{t('payroll.periods')}</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(payrolls.length)}</h3>
          <span className="text-[11px] text-gray-400">{t('payroll.totalPayrolls')}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <PayrollList payrolls={payrolls} />
      </div>
    </div>
  );
}
