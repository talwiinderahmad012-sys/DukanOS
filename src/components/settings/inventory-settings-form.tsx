'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ArrowLeft, Save, CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { updateInventorySettingsAction } from '@/app/actions/settings.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function InventorySettingsForm({
  businessId,
  initialSettings,
}: {
  businessId: string;
  initialSettings: any;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [form, setForm] = useState({
    lowStockThresholdDefault: initialSettings.lowStockThresholdDefault ?? 5,
    criticalStockThreshold: initialSettings.criticalStockThreshold ?? 2,
    allowNegativeStock: initialSettings.allowNegativeStock ?? false,
    requireStockAdjustmentReason: initialSettings.requireStockAdjustmentReason ?? true,
    enableLowStockNotifications: initialSettings.enableLowStockNotifications ?? true,
    slowMovingDays: initialSettings.slowMovingDays ?? 30,
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateInventorySettingsAction(businessId, {
      ...form,
      lowStockThresholdDefault: Number(form.lowStockThresholdDefault),
      criticalStockThreshold: Number(form.criticalStockThreshold),
      slowMovingDays: Number(form.slowMovingDays),
    });

    if (res.success) {
      setSuccessMsg(t('settings.inventorySettingsSaved', 'Inventory settings saved successfully.'));
      router.refresh();
    } else {
      setErrorMsg(res.message ? tm(res.message) : t('settings.inventorySaveFailed', 'Failed to save inventory settings.'));
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
          <span>{t('settings.backToSettings')}</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.inventorySettings')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('settings.inventoryDescription', 'Stock alerts, low stock thresholds, and adjustment rules.')}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Stock Alert Thresholds */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t('settings.stockThresholdsSection', 'Stock Thresholds & Alerts')}</h2>
              <p className="text-xs text-gray-500">{t('settings.stockThresholdsSectionDesc', 'Define warning limits for low and critical inventory levels')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 block" htmlFor="lowStock">
                {t('settings.lowStockThreshold', 'Default Low Stock Alert')}
              </label>
              <input
                id="lowStock"
                type="number"
                min="0"
                value={form.lowStockThresholdDefault}
                onChange={(e) => setForm({ ...form, lowStockThresholdDefault: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <span className="text-[11px] text-gray-400 block">{t('settings.lowStockHint', 'Triggers low stock badge')}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 block" htmlFor="critStock">
                {t('settings.criticalStockThreshold', 'Critical Stock Threshold')}
              </label>
              <input
                id="critStock"
                type="number"
                min="0"
                value={form.criticalStockThreshold}
                onChange={(e) => setForm({ ...form, criticalStockThreshold: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <span className="text-[11px] text-gray-400 block">{t('settings.criticalStockHint', 'Triggers urgent reorder warning')}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 block" htmlFor="slowDays">
                {t('settings.slowMovingDaysLabel', 'Slow Moving Days Threshold')}
              </label>
              <input
                id="slowDays"
                type="number"
                min="1"
                value={form.slowMovingDays}
                onChange={(e) => setForm({ ...form, slowMovingDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <span className="text-[11px] text-gray-400 block">{t('settings.slowMovingHint', 'Days without sale to flag as slow')}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Operations & Governance */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t('settings.inventoryGovernanceSection', 'Stock Governance & Rules')}</h2>
              <p className="text-xs text-gray-500">{t('settings.inventoryGovernanceSectionDesc', 'Enforce operational safeguards and audit requirements')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowNegativeStock}
                onChange={(e) => setForm({ ...form, allowNegativeStock: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 block">{t('settings.allowNegativeStock', 'Allow Negative Stock')}</span>
                <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">{t('settings.allowNegativeStockDesc', 'Permit sales even if system stock count reaches zero')}</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={form.requireStockAdjustmentReason}
                onChange={(e) => setForm({ ...form, requireStockAdjustmentReason: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 block">{t('settings.requireStockAdjustmentReason', 'Require Adjustment Reason')}</span>
                <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">{t('settings.requireStockAdjustmentReasonDesc', 'Staff must enter a reason (e.g. Damage, Theft, Expiry) when manually altering stock')}</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={form.enableLowStockNotifications}
                onChange={(e) => setForm({ ...form, enableLowStockNotifications: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 block">{t('settings.enableLowStockNotifications', 'Enable Low Stock Alerts')}</span>
                <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">{t('settings.enableLowStockNotificationsDesc', 'Send automatic bell notifications when products reach low stock thresholds')}</span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-xs hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? t('common.saving') : t('settings.saveSettings', 'Save Settings')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
