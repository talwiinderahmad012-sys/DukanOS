'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquareWarning, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { createComplaintAction, resolveComplaintAction } from '@/app/actions/employee.actions';
import { useTranslation } from '@/lib/i18n/language-context';

type ComplaintPriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export function SubmitComplaintModal({
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
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('WORKPLACE');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriorityType>('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createComplaintAction(businessId, {
      employeeId,
      title,
      category,
      description,
      priority,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(tm(res.message) || t('employees.failedToSubmitComplaint'));
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
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <MessageSquareWarning className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t('employees.submitWorkplaceComplaint')}</h3>
            <p className="text-xs text-gray-500">{t('employees.complaintModalSubtitle')}</p>
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
            <label className="text-xs font-semibold text-gray-700">{t('employees.complaintTitle')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('employees.complaintTitlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('common.category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="WORKPLACE">{t('employees.categoryWorkplace')}</option>
                <option value="PAYROLL">{t('employees.categoryPayroll')}</option>
                <option value="SAFETY">{t('employees.categorySafety')}</option>
                <option value="BEHAVIOR">{t('employees.categoryBehavior')}</option>
                <option value="OTHER">{t('employees.categoryOther')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('employees.priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriorityType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="LOW">{t('common.low')}</option>
                <option value="MEDIUM">{t('common.medium')}</option>
                <option value="HIGH">{t('common.high')}</option>
                <option value="URGENT">{t('employees.priorityUrgent')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.detailedDescription')}</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('employees.complaintDescriptionPlaceholder')}
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
              className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? t('common.submitting') : t('employees.submitComplaint')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ResolveComplaintModal({
  businessId,
  complaintId,
  complaintTitle,
  isOpen,
  onClose,
}: {
  businessId: string;
  complaintId: string;
  complaintTitle: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [status, setStatus] = useState<'RESOLVED' | 'IN_REVIEW' | 'REJECTED'>('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await resolveComplaintAction(businessId, {
      complaintId,
      status,
      resolutionNote,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(tm(res.message) || t('employees.failedToUpdateComplaint'));
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
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t('employees.resolveComplaintTitle')}</h3>
            <p className="text-xs text-gray-500 truncate max-w-xs">{complaintTitle}</p>
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
            <label className="text-xs font-semibold text-gray-700">{t('employees.resolutionStatus')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="RESOLVED">{t('employees.markAsResolved')}</option>
              <option value="IN_REVIEW">{t('employees.underInvestigation')}</option>
              <option value="REJECTED">{t('employees.dismissInvalid')}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.resolutionNoteLabel')}</label>
            <textarea
              required
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder={t('employees.resolutionNotePlaceholder')}
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
              {loading ? t('common.saving') : t('employees.confirmResolution')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
