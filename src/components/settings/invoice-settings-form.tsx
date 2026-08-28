'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowLeft, Save, CheckCircle2, AlertCircle, Eye, Layout } from 'lucide-react';
import { updateInvoiceDisplaySettingsAction } from '@/app/actions/settings.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function InvoiceSettingsForm({
  businessId,
  initialSettings,
}: {
  businessId: string;
  initialSettings: any;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [form, setForm] = useState({
    invoiceFooter: initialSettings.invoiceFooter || '',
    showLogoOnInvoice: initialSettings.showLogoOnInvoice ?? false,
    showPaymentMethodOnInvoice: initialSettings.showPaymentMethodOnInvoice ?? true,
    showDueAmountOnInvoice: initialSettings.showDueAmountOnInvoice ?? true,
    showCashierNameOnInvoice: initialSettings.showCashierNameOnInvoice ?? true,
    showBranchInfoOnInvoice: initialSettings.showBranchInfoOnInvoice ?? true,
    showCustomerInfoOnInvoice: initialSettings.showCustomerInfoOnInvoice ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayToggles = [
    { key: 'showLogoOnInvoice', label: t('settings.invoiceShowLogo'), desc: t('settings.invoiceShowLogoDesc', 'Display business logo on printed and PDF invoices') },
    { key: 'showPaymentMethodOnInvoice', label: t('settings.invoiceShowPaymentMethod'), desc: t('settings.invoiceShowPaymentMethodDesc', 'Show payment method (Cash, Card, Udhaar) on invoice') },
    { key: 'showDueAmountOnInvoice', label: t('settings.invoiceShowDueAmount'), desc: t('settings.invoiceShowDueAmountDesc', 'Display remaining due / balance for Udhaar transactions') },
    { key: 'showCashierNameOnInvoice', label: t('settings.invoiceShowCashierName'), desc: t('settings.invoiceShowCashierNameDesc', 'Include the name of the cashier or staff who processed the sale') },
    { key: 'showBranchInfoOnInvoice', label: t('settings.invoiceShowBranchInfo'), desc: t('settings.invoiceShowBranchInfoDesc', 'Show branch name, address, and contact details') },
    { key: 'showCustomerInfoOnInvoice', label: t('settings.invoiceShowCustomerInfo'), desc: t('settings.invoiceShowCustomerInfoDesc', 'Show customer name and contact info when attached to sale') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateInvoiceDisplaySettingsAction(businessId, form);
    if (res.success) {
      setSuccessMsg(t('settings.invoiceSettingsSaved'));
      router.refresh();
    } else {
      setErrorMsg(res.message ? tm(res.message) : t('settings.invoiceSettingsUpdateError'));
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
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.invoiceSettings')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('settings.invoiceDescription', 'Configure invoice display options, visibility toggles, and footer notes.')}
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
        {/* Section 1: Visibility & Layout Options */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t('settings.invoiceVisibilityOptions', 'Invoice Display Options')}</h2>
              <p className="text-xs text-gray-500">{t('settings.invoiceVisibilityOptionsDesc', 'Toggle information shown on customer invoices')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayToggles.map(({ key, label, desc }) => (
              <label
                key={key}
                className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">{label}</span>
                  <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">{desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Section 2: Footer & Note */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <Layout className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t('settings.invoiceFooterSection', 'Invoice Footer & Terms')}</h2>
              <p className="text-xs text-gray-500">{t('settings.invoiceFooterSectionDesc', 'Custom message or return policy printed at bottom')}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block" htmlFor="invoiceFooter">
              {t('settings.invoiceFooterLabel', 'Invoice Footer Message')}
            </label>
            <textarea
              id="invoiceFooter"
              value={form.invoiceFooter}
              onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              rows={3}
              placeholder={t('settings.invoiceFooterPlaceholder', 'Thank you for your business! Goods once sold cannot be returned without receipt.')}
            />
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
