'use client';

import Link from 'next/link';
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type PayrollListItem = {
  id: string;
  periodName: string;
  status: string;
  startDate: string;
  endDate: string;
  createdBy: string | null;
  salaryCount: number;
};

const PayrollStatus = { FINALIZED: 'FINALIZED', PAID: 'PAID' };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'payroll.statusDraft',
  FINALIZED: 'payroll.statusFinalized',
  PAID: 'common.paid',
  CANCELLED: 'common.cancelled',
};

export function PayrollList({ payrolls }: { payrolls: PayrollListItem[] }) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';

  if (payrolls.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary-soft text-gray-900 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900">{t('payroll.noPayrollsFound')}</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          {t('payroll.noPayrollsYetDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
            <th className="px-5 py-3.5 font-medium">{t('payroll.tablePeriod')}</th>
            <th className="px-5 py-3.5 font-medium">{t('payroll.tableDateRange')}</th>
            <th className="px-5 py-3.5 font-medium">{t('common.employees')}</th>
            <th className="px-5 py-3.5 font-medium">{t('common.status')}</th>
            <th className="px-5 py-3.5 font-medium text-end">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payrolls.map((payroll) => (
            <tr key={payroll.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3.5">
                <Link href={`/dashboard/payroll/${payroll.id}`} className="font-bold text-gray-900 hover:text-gray-900 transition-colors block">
                  {payroll.periodName}
                </Link>
                <span className="text-[11px] text-gray-400">
                  {t('payroll.createdBy', { name: payroll.createdBy || t('payroll.system') })}
                </span>
              </td>
              <td className="px-5 py-3.5 text-xs text-gray-600 font-mono">
                {new Date(payroll.startDate).toLocaleDateString(dateLocale)} - {new Date(payroll.endDate).toLocaleDateString(dateLocale)}
              </td>
              <td className="px-5 py-3.5 text-xs text-gray-600 font-bold">
                {payroll.salaryCount} <span className="font-normal text-gray-400 text-[11px]">{t('payroll.salariesUnit')}</span>
              </td>
              <td className="px-5 py-3.5">
                {payroll.status === PayrollStatus.FINALIZED || payroll.status === PayrollStatus.PAID ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                    <CheckCircle2 className="w-3 h-3" /> {t(STATUS_LABELS[payroll.status] ?? 'common.unknown')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-gray-900">
                    <AlertCircle className="w-3 h-3" /> {t(STATUS_LABELS[payroll.status] ?? 'common.unknown')}
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 text-end">
                <Link href={`/dashboard/payroll/${payroll.id}`} className="text-xs font-semibold text-gray-900 hover:underline">
                  {t('payroll.manage')} <span className="rtl-flip">&rarr;</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
