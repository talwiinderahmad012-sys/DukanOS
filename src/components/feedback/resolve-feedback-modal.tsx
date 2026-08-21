'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, X, MessageSquare, ShieldCheck } from 'lucide-react';
import { resolveFeedbackAction } from '@/app/actions/feedback.actions';

type FeedbackStatusOption = 'NEW' | 'REVIEWING' | 'RESOLVED' | 'ARCHIVED';

export function ResolveFeedbackModal({
  businessId,
  feedbackId,
  customerName,
  rating,
  message,
  currentStatus,
  currentResolution,
  isOpen,
  onClose,
}: {
  businessId: string;
  feedbackId: string;
  customerName?: string | null;
  rating: number;
  message: string;
  currentStatus: string;
  currentResolution?: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FeedbackStatusOption>(
    (currentStatus as FeedbackStatusOption) || 'RESOLVED'
  );
  const [resolutionNote, setResolutionNote] = useState(currentResolution || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await resolveFeedbackAction(businessId, {
      feedbackId,
      status,
      resolutionNote: resolutionNote.trim() || undefined,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(res.message || 'Failed to update feedback status');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Review & Resolve Customer Feedback</h3>
            <p className="text-xs text-gray-500">
              {customerName || 'Anonymous Customer'} • {rating}★ Review
            </p>
          </div>
        </div>

        {/* Feedback Quote Preview */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 italic">
          "{message}"
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'NEW' as const, label: 'New', color: 'border-blue-400 bg-blue-50 text-blue-800' },
                { id: 'REVIEWING' as const, label: 'Under Review', color: 'border-amber-400 bg-amber-50 text-amber-800' },
                { id: 'RESOLVED' as const, label: 'Resolved / Handled', color: 'border-green-400 bg-green-50 text-green-800' },
                { id: 'ARCHIVED' as const, label: 'Archived', color: 'border-gray-400 bg-gray-50 text-gray-800' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setStatus(item.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    status === item.id
                      ? `${item.color} ring-2 ring-blue-500`
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Internal Manager Resolution Note (Private)
            </label>
            <textarea
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Spoke with customer, offered free item on next visit, replaced damaged batch."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-400">
              Internal only. This note will never be visible on public pages or to regular employees.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
