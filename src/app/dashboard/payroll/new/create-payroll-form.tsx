'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createPayrollPeriodAction } from '@/app/actions/payroll.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function CreatePayrollForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createPayrollPeriodAction(businessId, { periodName, startDate, endDate });
    if (res.success) {
      router.push('/dashboard/payroll');
    } else {
      setError(tm(res.message) || t('common.error'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">{t('payroll.periodName')} *</label>
          <input type="text" required value={periodName} onChange={e => setPeriodName(e.target.value)} placeholder={t('payroll.periodNamePlaceholder')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('common.startDate')} *</label>
            <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('common.endDate')} *</label>
            <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-end gap-3 border-t">
        <Link href="/dashboard/payroll" className="px-4 py-2 text-gray-700 text-xs font-bold hover:bg-gray-100 rounded-xl transition-colors">
          {t('common.cancel')}
        </Link>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /> {loading ? t('common.saving') : t('payroll.createPeriodButton')}
        </button>
      </div>
    </form>
  );
}
