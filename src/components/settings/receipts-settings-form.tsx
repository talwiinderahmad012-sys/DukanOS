'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Receipt, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  QrCode
} from 'lucide-react';
import { updateReceiptSettingsAction } from '@/app/actions/settings.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function ReceiptsSettingsForm({
  businessId,
  businessName,
  initialSettings,
}: {
  businessId: string;
  businessName: string;
  initialSettings: any;
}) {
  const router = useRouter();
  const { t, tm, language, formatCurrency } = useTranslation();

  const [form, setForm] = useState({
    receiptHeader: initialSettings.receiptHeader || '',
    receiptFooter: initialSettings.receiptFooter || 'Thank you for shopping with us! Please visit again.',
    showFeedbackQr: initialSettings.showFeedbackQr ?? true,
    showTaxNumber: initialSettings.showTaxNumber || false,
    taxNumber: initialSettings.taxNumber || '',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateReceiptSettingsAction(businessId, form);

    if (res.success) {
      setSuccessMsg(t('settings.receiptTemplateSaved'));
      router.refresh();
    } else {
      setErrorMsg(res.message ? tm(res.message) : t('settings.receiptSaveFailed'));
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
          <span>{t('settings.backToSettings')}</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.receiptsPageTitle')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('settings.receiptsPageSubtitle')}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5"
        >
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              {t('settings.receiptHeaderSection')}
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.receiptHeaderNoticeLabel')}</label>
              <textarea
                rows={2}
                value={form.receiptHeader}
                onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })}
                placeholder={t('settings.receiptHeaderPlaceholder')}
                className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              {t('settings.receiptFooterSection')}
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('settings.receiptFarewellLabel')}</label>
              <textarea
                rows={2}
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                placeholder={t('settings.receiptFooterPlaceholder')}
                className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-purple-600" />
                  <span>{t('settings.feedbackQrLabel')}</span>
                </span>
                <span className="text-[11px] text-gray-500">
                  {t('settings.feedbackQrDescription')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.showFeedbackQr}
                onChange={(e) => setForm({ ...form, showFeedbackQr: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? t('common.saving') : t('settings.saveTemplate')}</span>
            </button>
          </div>
        </form>

        <div className="lg:col-span-5 space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {t('settings.thermalPreviewTitle')}
          </div>

          <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-xs font-mono text-[11px] space-y-3 max-w-xs mx-auto text-gray-800">
            <div className="text-center space-y-0.5 border-b border-dashed pb-2">
              <div className="font-bold text-sm text-black">{businessName}</div>
              <div className="text-[10px] text-gray-500">{t('settings.previewBranch')}</div>
              {form.receiptHeader && (
                <div className="text-[10px] text-gray-600 pt-1 whitespace-pre-wrap">{form.receiptHeader}</div>
              )}
            </div>

            <div className="space-y-1 text-[10px] border-b border-dashed pb-2">
              <div className="flex justify-between">
                <span>{t('settings.previewInvoice')}</span>
                <span>{new Date().toLocaleDateString(language === 'UR' ? 'ur-PK' : 'en-PK')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('settings.previewCashier')}</span>
                <span>{t('settings.previewWalkIn')}</span>
              </div>
            </div>

            <div className="space-y-1 border-b border-dashed pb-2">
              <div className="flex justify-between font-bold text-[10px]">
                <span>{t('settings.previewItemHeader')}</span>
                <span>{t('settings.previewColumnsHeader')}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>{t('settings.previewItemMilk')}</span>
                <span>2 x 280 = 560</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>{t('settings.previewItemRice')}</span>
                <span>1 x 1200 = 1200</span>
              </div>
            </div>

            <div className="space-y-1 font-bold text-xs border-b border-dashed pb-2 text-end">
              <div className="flex justify-between">
                <span>{t('settings.previewTotalLabel')}</span>
                <span>{formatCurrency(1760)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-normal text-gray-600">
                <span>{t('settings.previewPaidCashLabel')}</span>
                <span>{formatCurrency(2000)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-normal text-gray-600">
                <span>{t('settings.previewChangeLabel')}</span>
                <span>{formatCurrency(240)}</span>
              </div>
            </div>

            {form.showFeedbackQr && (
              <div className="text-center space-y-1 pt-1 border-b border-dashed pb-2">
                <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-lg mx-auto flex items-center justify-center text-[8px] font-bold text-gray-400">
                  [ QR ]
                </div>
                <div className="text-[9px] text-gray-500">{t('settings.previewQrCaption')}</div>
              </div>
            )}

            <div className="text-center text-[10px] text-gray-600 whitespace-pre-wrap pt-1">
              {form.receiptFooter}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
