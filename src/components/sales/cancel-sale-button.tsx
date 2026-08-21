'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, AlertTriangle, X } from 'lucide-react';
import { cancelSaleAction } from '@/app/actions/sale.actions';

export function CancelSaleButton({
  businessId,
  saleId,
  invoiceNumber,
  isCancelled,
}: {
  businessId: string;
  saleId: string;
  invoiceNumber?: string | null;
  isCancelled: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isCancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        <Ban className="w-4 h-4 text-red-500" /> Cancelled Sale
      </span>
    );
  }

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a reason for cancelling this sale (minimum 3 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await cancelSaleAction(businessId, saleId, reason.trim());

      if (!res.success) {
        setError(res.message || 'Failed to cancel sale.');
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'An unexpected error occurred during cancellation.');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5 print:hidden"
      >
        <Ban className="w-4 h-4" /> Cancel Sale
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
                <AlertTriangle className="w-5 h-5" />
                Cancel Sale Invoice
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Are you sure you want to cancel invoice{' '}
              <span className="font-semibold text-gray-900 font-mono">
                {invoiceNumber || `#${saleId.slice(0, 8)}`}
              </span>
              ?
            </p>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Reversal Effects:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>Sold items will be automatically returned to your stock.</li>
                <li>Any unpaid Udhaar added to customer will be reversed.</li>
                <li>Previously collected cash is not automatically refunded.</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer returned items, billing error"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Restoring Stock...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
