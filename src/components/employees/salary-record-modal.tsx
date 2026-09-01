'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, AlertCircle, X, CreditCard } from 'lucide-react';
import { createSalaryRecordAction, recordSalaryPaymentAction } from '@/app/actions/employee.actions';
import { useTranslation } from '@/lib/i18n/language-context';
import { useModalA11y } from '@/lib/a11y/use-modal-a11y';

type PaymentMethodType = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_WALLET';

export function CreateSalaryModal({
  businessId,
  employeeId,
  employees,
  defaultBaseSalary,
  isOpen,
  onClose,
}: {
  businessId: string;
  employeeId?: string;
  employees?: { id: string; name: string; basicSalary: number }[];
  defaultBaseSalary?: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t, tm, formatCurrency } = useTranslation();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(currentPeriod);
  const [baseSalary, setBaseSalary] = useState(defaultBaseSalary || 0);
  const [overtime, setOvertime] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const netSalary = Math.max(0, Number(baseSalary) + Number(overtime) + Number(bonus) - Number(deductions) - Number(advance));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createSalaryRecordAction(businessId, {
      employeeId: selectedEmployeeId,
      period,
      baseSalary: Number(baseSalary),
      overtime: Number(overtime),
      bonus: Number(bonus),
      deductions: Number(deductions),
      advance: Number(advance),
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(tm(res.message) || t('employees.failedToGenerateSalaryRecord'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-gray-400 hover:text-gray-600"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t('employees.generatePayrollRecord')}</h3>
            <p className="text-xs text-gray-500">{t('employees.generatePayrollSubtitle')}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.workerOrEmployee')}</label>
            {employees ? (
              <select
                required
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  const emp = employees.find(em => em.id === e.target.value);
                  if (emp) setBaseSalary(emp.basicSalary);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white"
              >
                <option value="" disabled>{t('employees.selectWorker')}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                readOnly
                value={employeeId} // In case employees is missing but id is provided
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('employees.salaryPeriodLabel')}</label>
              <input
                type="month"
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('employees.baseSalaryLabel')}</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('employees.overtimeLabel')}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={overtime}
                onChange={(e) => setOvertime(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-green-700 font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('employees.bonusLabel')}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={bonus}
                onChange={(e) => setBonus(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-green-700 font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('employees.deductionsLabel')}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={deductions}
                onChange={(e) => setDeductions(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-red-600 font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('employees.advanceLabel')}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={advance}
                onChange={(e) => setAdvance(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-red-600 font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">{t('employees.calculatedNetPayable')}</span>
            <span className="text-lg font-extrabold text-emerald-700">
              {formatCurrency(netSalary)}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.notesOptional')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('employees.salaryNotesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? t('employees.generating') : t('employees.saveSalaryRecord')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RecordPaymentModal({
  businessId,
  salaryId,
  period,
  netSalary,
  isOpen,
  onClose,
}: {
  businessId: string;
  salaryId: string;
  period: string;
  netSalary: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t, tm, formatCurrency } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await recordSalaryPaymentAction(businessId, {
      salaryId,
      paymentMethod: paymentMethod as any,
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(tm(res.message) || t('employees.failedToRecordPayment'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-gray-400 hover:text-gray-600"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t('employees.disburseSalaryPayment')}</h3>
            <p className="text-xs text-gray-500">
              {t('employees.paymentSummary', { period, amount: formatCurrency(netSalary) })}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.paymentChannel')}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="CASH">{t('employees.cashInHand')}</option>
              <option value="BANK_TRANSFER">{t('employees.bankTransfer')}</option>
              <option value="MOBILE_WALLET">{t('employees.mobileWalletOption')}</option>
              <option value="CARD">{t('employees.companyCardCheck')}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.paymentReferenceLabel')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('employees.paymentReferencePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? t('employees.processing') : t('employees.confirmPaid')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
