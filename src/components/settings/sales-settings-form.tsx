'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingCart, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Percent,
  FileText
} from 'lucide-react';
import { updateSalesSettingsAction } from '@/app/actions/settings.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function SalesSettingsForm({
  businessId,
  initialSettings,
}: {
  businessId: string;
  initialSettings: any;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();

  const [form, setForm] = useState({
    invoicePrefix: initialSettings.invoicePrefix || 'INV-',
    invoiceStartingNumber: initialSettings.invoiceStartingNumber || 1001,
    maxCashierDiscountPercent: initialSettings.maxCashierDiscountPercent || 5,
    maxManagerDiscountPercent: initialSettings.maxManagerDiscountPercent || 15,
    allowNegativeStock: initialSettings.allowNegativeStock || false,
    requireCustomerForCredit: initialSettings.requireCustomerForCredit ?? true,
    requireSaleCancellationReason: initialSettings.requireSaleCancellationReason ?? true,
    allowPriceOverride: initialSettings.allowPriceOverride ?? false,
    autoPrintReceipt: initialSettings.autoPrintReceipt ?? false,
    defaultPaymentMethod: initialSettings.defaultPaymentMethod || 'CASH',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateSalesSettingsAction(businessId, {
      ...form,
      maxCashierDiscountPercent: Number(form.maxCashierDiscountPercent),
      maxManagerDiscountPercent: Number(form.maxManagerDiscountPercent),
      invoiceStartingNumber: Number(form.invoiceStartingNumber),
    });

    if (res.success) {
      setSuccessMsg(t('settings.salesRulesSaved'));
      router.refresh();
    } else {
      setErrorMsg(res.message ? tm(res.message) : t('settings.salesSaveFailed'));
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
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.salesPageTitle')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('settings.salesPageSubtitle')}
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
            <Percent className="w-3.5 h-3.5 text-gray-500" />
            <span>{t('settings.discountPermissionsSection')}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.maxCashierDiscount')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.maxCashierDiscountPercent}
                onChange={(e) => setForm({ ...form, maxCashierDiscountPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">{t('settings.maxCashierDiscountHint')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.maxManagerDiscount')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.maxManagerDiscountPercent}
                onChange={(e) => setForm({ ...form, maxManagerDiscountPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">{t('settings.maxManagerDiscountHint')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>{t('settings.invoiceNumberingSection')}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.invoiceNumberPrefix')}</label>
              <input
                type="text"
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                placeholder="INV-"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">{t('settings.invoiceNumberPrefixHint')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.startingSequenceNumber')}</label>
              <input
                type="number"
                min="1"
                value={form.invoiceStartingNumber}
                onChange={(e) => setForm({ ...form, invoiceStartingNumber: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">{t('settings.startingSequenceHint')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-gray-500" />
            <span>{t('settings.checkoutConfigSection')}</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.defaultPaymentMethod')}</label>
              <select
                value={form.defaultPaymentMethod}
                onChange={(e) => setForm({ ...form, defaultPaymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="CASH">{t('settings.paymentCash')}</option>
                <option value="CARD">{t('settings.paymentCard')}</option>
                <option value="BANK_TRANSFER">{t('settings.paymentBankTransfer')}</option>
                <option value="MOBILE_WALLET">{t('settings.paymentMobileWallet')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block">{t('settings.allowPriceOverride')}</span>
                <span className="text-[11px] text-gray-500">
                  {t('settings.allowPriceOverrideDescription')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.allowPriceOverride}
                onChange={(e) => setForm({ ...form, allowPriceOverride: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>
            
            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block">{t('settings.autoPrintReceipt')}</span>
                <span className="text-[11px] text-gray-500">
                  {t('settings.autoPrintReceiptDescription')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.autoPrintReceipt}
                onChange={(e) => setForm({ ...form, autoPrintReceipt: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
            <span>{t('settings.creditPoliciesSection')}</span>
          </h2>

          <div className="space-y-3">
            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block">{t('settings.requireCustomerCredit')}</span>
                <span className="text-[11px] text-gray-500">
                  {t('settings.requireCustomerCreditDescription')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.requireCustomerForCredit}
                onChange={(e) => setForm({ ...form, requireCustomerForCredit: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>

            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block">{t('settings.requireCancellationReason')}</span>
                <span className="text-[11px] text-gray-500">
                  {t('settings.requireCancellationReasonDescription')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.requireSaleCancellationReason}
                onChange={(e) => setForm({ ...form, requireSaleCancellationReason: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>
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
            <span>{saving ? t('settings.savingRules') : t('settings.saveRules')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
