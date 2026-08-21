'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, X, CheckCircle2 } from 'lucide-react';
import { recordCustomerPaymentAction } from '@/app/actions/customer.actions';

export function RecordPaymentModal({
  businessId,
  customerId,
  customerName,
  currentOutstanding,
}: {
  businessId: string;
  customerId: string;
  customerName: string;
  currentOutstanding: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await recordCustomerPaymentAction(businessId, {
        customerId,
        amount: parsedAmount,
        method,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.message || 'Failed to record customer payment.');
        setLoading(false);
        return;
      }

      setIsOpen(false);
      setAmount('');
      setNotes('');
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
      >
        <DollarSign className="w-4 h-4" /> Receive Debt Payment
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Receive Payment from {customerName}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex justify-between items-center">
              <span className="text-gray-500 font-medium">Current Outstanding Udhaar:</span>
              <span className="text-base font-bold text-orange-600">
                Rs. {currentOutstanding.toLocaleString()}
              </span>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Payment Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                {currentOutstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(currentOutstanding.toString())}
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    Set Full Balance (Rs. {currentOutstanding.toLocaleString()})
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer / Online</option>
                  <option value="MOBILE_WALLET">EasyPaisa / JazzCash / Mobile Wallet</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Notes / Receipt Memo
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional memo (e.g. Received via Bank Transfer)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
