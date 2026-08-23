'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowLeft, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { updateInvoiceDisplaySettingsAction } from '@/app/actions/settings.actions';

export function InvoiceSettingsForm({ businessId, initialSettings }: { businessId: string, initialSettings: any }) {
  const router = useRouter();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateInvoiceDisplaySettingsAction(businessId, form);
    if (res.success) {
      setSuccessMsg('Invoice settings updated.');
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Error updating settings');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/settings" className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Invoice Settings</h1>
      </div>
      {successMsg && <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-semibold">{successMsg}</div>}
      {errorMsg && <div className="p-4 bg-red-50 text-red-800 rounded-2xl text-xs font-semibold">{errorMsg}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">Invoice Footer</label>
            <textarea value={form.invoiceFooter} onChange={e => setForm({...form, invoiceFooter: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium" rows={3}></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['showLogoOnInvoice', 'showPaymentMethodOnInvoice', 'showDueAmountOnInvoice', 'showCashierNameOnInvoice', 'showBranchInfoOnInvoice', 'showCustomerInfoOnInvoice'].map((field) => (
              <label key={field} className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={(form as any)[field]} onChange={e => setForm({...form, [field]: e.target.checked})} className="w-4 h-4 rounded text-blue-600" />
                {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t flex justify-end gap-3">
          <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}
