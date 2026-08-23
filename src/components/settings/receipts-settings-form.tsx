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
      setSuccessMsg('Receipt template updated successfully.');
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to update receipt settings.');
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
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Receipts & Thermal Invoices</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Customize the layout, header/footer messages, and QR codes printed on customer receipts.
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
        {/* Left Form (7 cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5"
        >
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              1. Receipt Header & Notes
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Header Subtext / Notice</label>
              <textarea
                rows={2}
                value={form.receiptHeader}
                onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })}
                placeholder="e.g. NTN: 1234567-8 | Return policy: 3 days"
                className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              2. Footer & Feedback QR
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Footer Farewell Message</label>
              <textarea
                rows={2}
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                placeholder="Thank you for shopping with us!"
                className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-purple-600" />
                  <span>Print Customer Feedback QR Code</span>
                </span>
                <span className="text-[11px] text-gray-500">
                  Adds a scanable review link on the bottom of thermal receipts.
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.showFeedbackQr}
                onChange={(e) => setForm({ ...form, showFeedbackQr: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </form>

        {/* Right Live Thermal Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> Live Thermal Slip Preview (80mm)
          </div>

          <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-xs font-mono text-[11px] space-y-3 max-w-xs mx-auto text-gray-800">
            <div className="text-center space-y-0.5 border-b border-dashed pb-2">
              <div className="font-bold text-sm text-black">{businessName}</div>
              <div className="text-[10px] text-gray-500">Main Commercial Branch</div>
              {form.receiptHeader && (
                <div className="text-[10px] text-gray-600 pt-1 whitespace-pre-wrap">{form.receiptHeader}</div>
              )}
            </div>

            <div className="space-y-1 text-[10px] border-b border-dashed pb-2">
              <div className="flex justify-between">
                <span>Inv: #INV-1042</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier: Counter 1</span>
                <span>Walk-in</span>
              </div>
            </div>

            <div className="space-y-1 border-b border-dashed pb-2">
              <div className="flex justify-between font-bold text-[10px]">
                <span>ITEM</span>
                <span>QTY x PRICE = TOTAL</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Milk Pack 1L</span>
                <span>2 x 280 = 560</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Basmati Rice 5kg</span>
                <span>1 x 1200 = 1200</span>
              </div>
            </div>

            <div className="space-y-1 font-bold text-xs border-b border-dashed pb-2 text-right">
              <div className="flex justify-between">
                <span>TOTAL:</span>
                <span>Rs. 1,760</span>
              </div>
              <div className="flex justify-between text-[10px] font-normal text-gray-600">
                <span>PAID (CASH):</span>
                <span>Rs. 2,000</span>
              </div>
              <div className="flex justify-between text-[10px] font-normal text-gray-600">
                <span>CHANGE:</span>
                <span>Rs. 240</span>
              </div>
            </div>

            {form.showFeedbackQr && (
              <div className="text-center space-y-1 pt-1 border-b border-dashed pb-2">
                <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-lg mx-auto flex items-center justify-center text-[8px] font-bold text-gray-400">
                  [ QR ]
                </div>
                <div className="text-[9px] text-gray-500">Scan to rate your shopping experience</div>
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
