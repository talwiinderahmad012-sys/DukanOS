'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateSalariesAction, finalizePayrollAction, recordSalaryPaymentAction } from '@/app/actions/payroll.actions';
import { CheckCircle2, Play, FileCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type PayrollSalaryRow = {
  id: string;
  employeeName: string;
  employeeCode: string | null;
  position: string | null;
  baseSalary: number;
  netSalary: number;
  paymentStatus: string;
};

export type PayrollDetailData = {
  id: string;
  periodName: string;
  status: string;
  startDate: string;
  endDate: string;
  salaries: PayrollSalaryRow[];
};

const PayrollStatus = { DRAFT: 'DRAFT', FINALIZED: 'FINALIZED' };
const SalaryPaymentStatus = { PAID: 'PAID' };

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: 'common.paid',
  PENDING: 'common.pending',
};

export function PayrollDetailClient({ businessId, payroll }: { businessId: string; payroll: PayrollDetailData }) {
  const router = useRouter();
  const { t, tm, formatCurrency } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payModal, setPayModal] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateSalariesAction(businessId, payroll.id);
    if (res.success) router.refresh();
    else setError(tm(res.message) || t('common.error'));
    setLoading(false);
  };

  const handleFinalize = async () => {
    if (!confirm(t('payroll.confirmFinalize'))) return;
    setLoading(true);
    const res = await finalizePayrollAction(businessId, payroll.id);
    if (res.success) router.refresh();
    else setError(tm(res.message) || t('common.error'));
    setLoading(false);
  };

  const handlePay = async (salaryId: string, amount: number) => {
    setLoading(true);
    const res = await recordSalaryPaymentAction(businessId, salaryId, { amount, paymentMethod });
    if (res.success) {
      setPayModal(null);
      router.refresh();
    } else {
      setError(tm(res.message) || t('common.error'));
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">

      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 text-sm">{t('payroll.employeeSalaries')}</h3>
        <div className="flex gap-2">
          {payroll.status === PayrollStatus.DRAFT && (
            <>
              <button onClick={handleGenerate} disabled={loading} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-gray-50">
                <Play className="w-3.5 h-3.5" /> {t('payroll.generateSalaries')}
              </button>
              {payroll.salaries.length > 0 && (
                <button onClick={handleFinalize} disabled={loading} className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-primary-hover">
                  <FileCheck className="w-3.5 h-3.5" /> {t('payroll.finalizePayroll')}
                </button>
              )}
            </>
          )}
          {payroll.status === PayrollStatus.FINALIZED && (
            <span className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('payroll.statusFinalized')}
            </span>
          )}
        </div>
      </div>

      {error && <div className="p-3 m-4 bg-red-50 text-red-700 text-xs rounded-xl">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse text-sm">
          <thead>
            <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b">
              <th className="px-5 py-3.5 font-medium">{t('common.employee')}</th>
              <th className="px-5 py-3.5 font-medium">{t('payroll.baseSalary')}</th>
              <th className="px-5 py-3.5 font-medium">{t('payroll.netSalary')}</th>
              <th className="px-5 py-3.5 font-medium">{t('common.status')}</th>
              <th className="px-5 py-3.5 font-medium text-end">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payroll.salaries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-xs">
                  {t('payroll.noSalariesGenerated')}
                </td>
              </tr>
            ) : (
              payroll.salaries.map((salary) => (
                <tr key={salary.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-gray-900">{salary.employeeName}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{salary.employeeCode} &bull; {salary.position}</div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-900 font-mono">{formatCurrency(salary.baseSalary)}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-gray-900 font-mono">{formatCurrency(salary.netSalary)}</td>
                  <td className="px-5 py-3.5">
                    {salary.paymentStatus === SalaryPaymentStatus.PAID ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded-md">{t(PAYMENT_STATUS_LABELS[salary.paymentStatus] ?? 'common.unknown')}</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">{t(PAYMENT_STATUS_LABELS[salary.paymentStatus] ?? 'common.pending')}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-end">
                    {payroll.status === PayrollStatus.FINALIZED && salary.paymentStatus !== SalaryPaymentStatus.PAID && (
                      payModal === salary.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} aria-label={t('payroll.paymentMethod')} className="px-2 py-1 text-xs border rounded">
                            <option value="CASH">{t('payroll.paymentMethodCash')}</option>
                            <option value="BANK_TRANSFER">{t('payroll.paymentMethodBankTransfer')}</option>
                            <option value="MOBILE_WALLET">{t('payroll.paymentMethodMobileWallet')}</option>
                          </select>
                          <button onClick={() => handlePay(salary.id, salary.netSalary)} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">{t('payroll.confirmPay')}</button>
                          <button onClick={() => setPayModal(null)} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">{t('common.cancel')}</button>
                        </div>
                      ) : (
                        <button onClick={() => setPayModal(salary.id)} className="text-xs font-semibold text-gray-900 hover:underline">
                          {t('payroll.payNow')} <span className="rtl-flip">&rarr;</span>
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
