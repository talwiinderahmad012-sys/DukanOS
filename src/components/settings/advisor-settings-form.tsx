'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Sliders,
  TrendingDown,
  Clock,
  DollarSign
} from 'lucide-react';
import { updateAdvisorSettingsAction } from '@/app/actions/settings.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function AdvisorSettingsForm({
  businessId,
  initialSettings,
}: {
  businessId: string;
  initialSettings: any;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();

  const [form, setForm] = useState({
    salesDeclineThresholdPercent: initialSettings.salesDeclineThresholdPercent || 15,
    profitDeclineThresholdPercent: initialSettings.profitDeclineThresholdPercent || 15,
    expenseSpikeThresholdPercent: initialSettings.expenseSpikeThresholdPercent || 20,
    creditRiskThresholdPercent: initialSettings.creditRiskThresholdPercent || 25,
    slowMovingDays: initialSettings.slowMovingDays || 30,
    advisorRuleLowStock: initialSettings.advisorRuleLowStock ?? true,
    advisorRuleSlowMoving: initialSettings.advisorRuleSlowMoving ?? true,
    advisorRuleSalesDecline: initialSettings.advisorRuleSalesDecline ?? true,
    advisorRuleProfitDecline: initialSettings.advisorRuleProfitDecline ?? true,
    advisorRuleCreditRisk: initialSettings.advisorRuleCreditRisk ?? true,
    advisorRuleExpenseSpike: initialSettings.advisorRuleExpenseSpike ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateAdvisorSettingsAction(businessId, {
      ...form,
      salesDeclineThresholdPercent: Number(form.salesDeclineThresholdPercent),
      profitDeclineThresholdPercent: Number(form.profitDeclineThresholdPercent),
      expenseSpikeThresholdPercent: Number(form.expenseSpikeThresholdPercent),
      creditRiskThresholdPercent: Number(form.creditRiskThresholdPercent),
      slowMovingDays: Number(form.slowMovingDays),
    });

    if (res.success) {
      setSuccessMsg(t('settings.advisorSettingsSaved'));
      router.refresh();
    } else {
      setErrorMsg(res.message ? tm(res.message) : t('settings.advisorSaveFailed'));
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
          <span>{t('settings.backToSettings')}</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.advisorThresholdsTitle')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('settings.advisorThresholdsSubtitle')}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-gray-500" />
            <span>{t('settings.advisorSensitivitySection')}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.salesDropTrigger')}</label>
              <input
                type="number"
                min="5"
                max="80"
                value={form.salesDeclineThresholdPercent}
                onChange={(e) => setForm({ ...form, salesDeclineThresholdPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">{t('settings.salesDropTriggerHint')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.slowMovingPeriod')}</label>
              <input
                type="number"
                min="7"
                max="365"
                value={form.slowMovingDays}
                onChange={(e) => setForm({ ...form, slowMovingDays: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">{t('settings.slowMovingPeriodHint')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.profitContraction')}</label>
              <input
                type="number"
                min="2"
                max="50"
                value={form.profitDeclineThresholdPercent}
                onChange={(e) => setForm({ ...form, profitDeclineThresholdPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">{t('settings.profitContractionHint')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.creditRiskLabel')}</label>
              <input
                type="number"
                min="10"
                max="100"
                value={form.creditRiskThresholdPercent}
                onChange={(e) => setForm({ ...form, creditRiskThresholdPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">{t('settings.creditRiskHint')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            {t('settings.advisorRulesSection')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'advisorRuleLowStock', label: t('settings.advisorRuleLowStock') },
              { id: 'advisorRuleSlowMoving', label: t('settings.advisorRuleSlowMoving') },
              { id: 'advisorRuleSalesDecline', label: t('settings.advisorRuleSalesDecline') },
              { id: 'advisorRuleProfitDecline', label: t('settings.advisorRuleProfitDecline') },
              { id: 'advisorRuleCreditRisk', label: t('settings.advisorRuleCreditRisk') },
              { id: 'advisorRuleExpenseSpike', label: t('settings.advisorRuleExpenseSpike') },
            ].map((rule) => (
              <label
                key={rule.id}
                className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-800">{rule.label}</span>
                <input
                  type="checkbox"
                  checked={(form as any)[rule.id]}
                  onChange={(e) => setForm({ ...form, [rule.id]: e.target.checked })}
                  className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/settings"
            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
          >
            {t('common.cancel')}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? t('common.saving') : t('settings.saveAdvisorSettings')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
