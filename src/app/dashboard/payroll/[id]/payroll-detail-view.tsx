'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { PayrollDetailClient, type PayrollDetailData } from './payroll-detail-client';

export function PayrollDetailView({ businessId, payroll }: { businessId: string; payroll: PayrollDetailData }) {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const totalBase = payroll.salaries.reduce((sum, salary) => sum + salary.baseSalary, 0);
  const totalNet = payroll.salaries.reduce((sum, salary) => sum + salary.netSalary, 0);
  const paidCount = payroll.salaries.filter((salary) => salary.paymentStatus === 'PAID').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/payroll" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4 rtl-flip" /> {t('payroll.allPayrolls')}
        </Link>
        <span className="text-gray-900 font-semibold">&bull; {payroll.periodName}</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('payroll.payrollTitle', { periodName: payroll.periodName })}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date(payroll.startDate).toLocaleDateString(dateLocale)} - {new Date(payroll.endDate).toLocaleDateString(dateLocale)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">{t('payroll.totalNetSalary')}</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalNet)}</h3>
          <span className="text-[11px] text-gray-400">{t('payroll.gross')}: {formatCurrency(totalBase)}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-green-700 uppercase">{t('payroll.salariesPaid')}</span>
          <h3 className="text-2xl font-bold text-green-700 mt-1">{formatNumber(paidCount)} / {formatNumber(payroll.salaries.length)}</h3>
          <span className="text-[11px] text-green-600">{t('common.employees')}</span>
        </div>
      </div>

      <PayrollDetailClient businessId={businessId} payroll={payroll} />
    </div>
  );
}
