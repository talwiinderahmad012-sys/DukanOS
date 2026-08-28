'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Megaphone, AlertCircle, Send, ShieldAlert } from 'lucide-react';
import { createAnnouncementAction } from '@/app/actions/communication.actions';
import { useTranslation } from '@/lib/i18n/language-context';

type PriorityOption = 'NORMAL' | 'IMPORTANT' | 'URGENT';
type TargetOption = 'ALL' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'EMPLOYEE';

export function NewAnnouncementModal({
  businessId,
  isOpen,
  onClose,
}: {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t, tm } = useTranslation();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<PriorityOption>('NORMAL');
  const [targetRole, setTargetRole] = useState<TargetOption>('ALL');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createAnnouncementAction(businessId, {
      title,
      message,
      priority,
      targetRole,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(tm(res.message) || t('communications.publishFailed'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t('communications.broadcastTitle')}</h3>
            <p className="text-xs text-gray-500">{t('communications.broadcastSubtitle')}</p>
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
            <label className="text-xs font-semibold text-gray-700">{t('communications.title')} <span className="text-red-500">*</span></label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('communications.titlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('communications.messageBody')} <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('communications.messageBodyPlaceholder')}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('communications.priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityOption)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="NORMAL">{t('communications.priorityNormal')}</option>
                <option value="IMPORTANT">{t('communications.priorityImportant')}</option>
                <option value="URGENT">{t('communications.priorityUrgent')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('communications.targetAudience')}</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as TargetOption)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">{t('communications.audienceAll')}</option>
                <option value="CASHIER">{t('communications.audienceCashier')}</option>
                <option value="EMPLOYEE">{t('communications.audienceEmployee')}</option>
                <option value="MANAGER">{t('communications.audienceManager')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('communications.expiryLabel')}</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
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
              className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? t('communications.publishing') : t('communications.publishAnnouncement')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
