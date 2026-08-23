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

export function SalesSettingsForm({
  businessId,
  initialSettings,
}: {
  businessId: string;
  initialSettings: any;
}) {
  const router = useRouter();

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
      setSuccessMsg('Sales & POS rules updated successfully.');
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to update sales settings.');
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
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Sales & POS Rules</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Configure financial guardrails, cashier discount limits, and invoice numbering sequence.
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
        
        {/* Section 1: Discount Limits */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-gray-500" />
            <span>1. Role-Based Discount Permissions</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Max Cashier Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.maxCashierDiscountPercent}
                onChange={(e) => setForm({ ...form, maxCashierDiscountPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">Cashiers cannot apply discounts greater than this.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Max Manager Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.maxManagerDiscountPercent}
                onChange={(e) => setForm({ ...form, maxManagerDiscountPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">Managers cannot exceed this discount without owner approval.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Invoice Numbering Rules */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>2. Invoice Numbering Rules</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Invoice Number Prefix</label>
              <input
                type="text"
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                placeholder="INV-"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">Applied to new future sales invoices.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Starting Sequence Number</label>
              <input
                type="number"
                min="1"
                value={form.invoiceStartingNumber}
                onChange={(e) => setForm({ ...form, invoiceStartingNumber: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">Base sequence index for your store.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Checkout Configuration */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-gray-500" />
            <span>3. Checkout Configuration</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Default Payment Method</label>
              <select
                value={form.defaultPaymentMethod}
                onChange={(e) => setForm({ ...form, defaultPaymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="MOBILE_WALLET">Mobile Wallet</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block">Allow Price Override</span>
                <span className="text-[11px] text-gray-500">
                  Allow cashiers to change product prices at checkout.
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.allowPriceOverride}
                onChange={(e) => setForm({ ...form, allowPriceOverride: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
            
            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block">Auto-Print Receipt</span>
                <span className="text-[11px] text-gray-500">
                  Automatically open print dialog when sale is completed.
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.autoPrintReceipt}
                onChange={(e) => setForm({ ...form, autoPrintReceipt: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Section 4: Financial Safety Policies */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
            <span>4. Checkout & Credit Policies</span>
          </h2>

          <div className="space-y-3">
            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block">Require Customer for Credit (Udhaar) Sales</span>
                <span className="text-[11px] text-gray-500">
                  Prevents walk-in checkout without attaching a registered customer when unpaid balance &gt; 0.
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.requireCustomerForCredit}
                onChange={(e) => setForm({ ...form, requireCustomerForCredit: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer border border-gray-100 hover:bg-gray-100/60 transition-colors">
              <div>
                <span className="text-xs font-bold text-gray-900 block">Require Written Reason to Cancel Sales</span>
                <span className="text-[11px] text-gray-500">
                  Staff must provide a clear reason before voiding a completed transaction.
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.requireSaleCancellationReason}
                onChange={(e) => setForm({ ...form, requireSaleCancellationReason: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/settings"
            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving Rules...' : 'Save Rules'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
