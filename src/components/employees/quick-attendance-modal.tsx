'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { recordAttendanceAction } from '@/app/actions/employee.actions';

type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';

export function QuickAttendanceModal({
  businessId,
  employeeId,
  employeeName,
  currentStatus,
  isOpen,
  onClose,
}: {
  businessId: string;
  employeeId: string;
  employeeName: string;
  currentStatus?: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AttendanceStatusType>(
    (currentStatus as AttendanceStatusType) || 'PRESENT'
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const now = new Date();
    const res = await recordAttendanceAction(businessId, {
      employeeId,
      status,
      checkIn: status === 'PRESENT' || status === 'LATE' ? now.toISOString() : undefined,
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(res.message || 'Failed to record attendance');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Mark Attendance</h3>
            <p className="text-xs text-gray-500">{employeeName}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Attendance Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'PRESENT' as const, label: 'Present', color: 'border-green-300 text-green-700 bg-green-50/50' },
                { id: 'LATE' as const, label: 'Late Arrival', color: 'border-amber-300 text-amber-700 bg-amber-50/50' },
                { id: 'ABSENT' as const, label: 'Absent', color: 'border-red-300 text-red-700 bg-red-50/50' },
                { id: 'LEAVE' as const, label: 'On Leave', color: 'border-blue-300 text-blue-700 bg-blue-50/50' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setStatus(item.id)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
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
            <label className="text-xs font-semibold text-gray-700">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Arrived 30 mins late due to traffic, or notified in advance"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
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
              {loading ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
