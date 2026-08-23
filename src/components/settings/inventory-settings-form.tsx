'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { updateInventorySettingsAction } from '@/app/actions/settings.actions';

export function InventorySettingsForm({ businessId, initialSettings }: { businessId: string, initialSettings: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    lowStockThresholdDefault: initialSettings.lowStockThresholdDefault || 5,
    criticalStockThreshold: initialSettings.criticalStockThreshold || 2,
    allowNegativeStock: initialSettings.allowNegativeStock ?? false,
    requireStockAdjustmentReason: initialSettings.requireStockAdjustmentReason ?? true,
    enableLowStockNotifications: initialSettings.enableLowStockNotifications ?? true,
    slowMovingDays: initialSettings.slowMovingDays || 30,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateInventorySettingsAction(businessId, {
      ...form,
      lowStockThresholdDefault: Number(form.lowStockThresholdDefault),
      criticalStockThreshold: Number(form.criticalStockThreshold),
      slowMovingDays: Number(form.slowMovingDays),
    });
    router.refresh();
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/settings" className="text-xs text-gray-500 font-semibold flex items-center gap-1 mb-2"><ArrowLeft className="w-3.5 h-3.5" />Back</Link>
        <h1 className="text-2xl font-bold">Inventory Settings</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="text-xs font-semibold">Low Stock Threshold <input type="number" value={form.lowStockThresholdDefault} onChange={e => setForm({...form, lowStockThresholdDefault: Number(e.target.value)})} className="block w-full border rounded-xl p-2 mt-1" /></label>
          <label className="text-xs font-semibold">Critical Stock Threshold <input type="number" value={form.criticalStockThreshold} onChange={e => setForm({...form, criticalStockThreshold: Number(e.target.value)})} className="block w-full border rounded-xl p-2 mt-1" /></label>
          <label className="text-xs font-semibold">Slow Moving Days <input type="number" value={form.slowMovingDays} onChange={e => setForm({...form, slowMovingDays: Number(e.target.value)})} className="block w-full border rounded-xl p-2 mt-1" /></label>
        </div>
        <div className="space-y-2">
          {['allowNegativeStock', 'requireStockAdjustmentReason', 'enableLowStockNotifications'].map(field => (
            <label key={field} className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={(form as any)[field]} onChange={e => setForm({...form, [field]: e.target.checked})} className="w-4 h-4" /> {field.replace(/([A-Z])/g, ' $1')}
            </label>
          ))}
        </div>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Save</button>
      </form>
    </div>
  );
}
