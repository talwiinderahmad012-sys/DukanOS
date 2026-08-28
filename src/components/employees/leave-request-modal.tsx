'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, AlertCircle, X } from 'lucide-react';
import { createLeaveRequestAction, reviewLeaveAction } from '@/app/actions/employee.actions';
import { useTranslation } from '@/lib/i18n/language-context';

type LeaveTypeVal = 'CASUAL' | 'SICK' | 'ANNUAL' | 'UNPAID' | 'OTHER';

export function RequestLeaveModal({
  businessId,
  employeeId,
  isOpen,
  onClose,
}: {
  businessId: string;
  employeeId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [leaveType, setLeaveType] = useState<LeaveTypeVal>('CASUAL');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createLeaveRequestAction(businessId, {
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(tm(res.message) || t('employees.failedToSubmitLeaveRequest'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-gray-400 hover:text-gray-600"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-soft text-gray-900 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t('employees.requestLeave')}</h3>
            <p className="text-xs text-gray-500">{t('employees.requestLeaveSubtitle')}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.leaveType')}</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveTypeVal)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="CASUAL">{t('employees.casualLeave')}</option>
              <option value="SICK">{t('employees.sickLeave')}</option>
              <option value="ANNUAL">{t('employees.annualLeave')}</option>
              <option value="UNPAID">{t('employees.unpaidLeave')}</option>
              <option value="OTHER">{t('employees.otherEmergencyLeave')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('common.startDate')}</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('common.endDate')}</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.reason')}</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('employees.reasonPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? t('common.submitting') : t('employees.submitRequest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ReviewLeaveModal({
  businessId,
  leaveId,
  employeeName,
  isOpen,
  onClose,
}: {
  businessId: string;
  leaveId: string;
  employeeName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [status, setStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await reviewLeaveAction(businessId, {
      leaveId,
      status,
      approvalNotes: notes.trim() || undefined,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(tm(res.message) || t('employees.failedToReviewLeave'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-gray-400 hover:text-gray-600"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t('employees.reviewLeaveApplication')}</h3>
            <p className="text-xs text-gray-500">{employeeName}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.decision')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('APPROVED')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  status === 'APPROVED'
                    ? 'border-green-400 bg-green-50 text-green-800 ring-2 ring-green-500'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {t('employees.approveLeave')}
              </button>
              <button
                type="button"
                onClick={() => setStatus('REJECTED')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  status === 'REJECTED'
                    ? 'border-red-400 bg-red-50 text-red-800 ring-2 ring-red-500'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {t('employees.rejectLeave')}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.managerNotesLabel')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('employees.managerNotesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 ${
                status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? t('common.submitting') : status === 'APPROVED' ? t('employees.confirmApproval') : t('employees.confirmRejection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
