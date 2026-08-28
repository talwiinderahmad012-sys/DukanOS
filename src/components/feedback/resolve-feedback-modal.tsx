'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { resolveFeedbackAction } from '@/app/actions/feedback.actions';

type FeedbackStatusOption = 'NEW' | 'REVIEWING' | 'RESOLVED' | 'ARCHIVED';

const STATUS_OPTIONS: FeedbackStatusOption[] = ['NEW', 'REVIEWING', 'RESOLVED', 'ARCHIVED'];

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
  const { t, tm } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState<FeedbackStatusOption>(
    (currentStatus as FeedbackStatusOption) || 'RESOLVED'
  );
  const [resolutionNote, setResolutionNote] = useState(currentResolution || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptionLabel = (option: FeedbackStatusOption): string => {
    switch (option) {
      case 'NEW':
        return t('feedback.resolve.statusNew');
      case 'REVIEWING':
        return t('feedback.resolve.statusReviewing');
      case 'RESOLVED':
        return t('feedback.resolve.statusResolved');
      case 'ARCHIVED':
        return t('feedback.resolve.statusArchived');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      setError(res.message || t('feedback.resolve.failed'));
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('feedback.resolve.title')}
      description={t('feedback.resolve.customerReview', {
        name: customerName || t('feedback.dashboard.anonymousCustomer'),
        rating,
      })}
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" size="md" onClick={() => handleSubmit()} loading={loading}>
            {t('feedback.resolve.saveResolution')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-primary-soft text-primary" aria-hidden="true">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="rounded-input border border-border bg-gray-50 p-3 text-xs italic text-gray-700">
            &ldquo;{message}&rdquo;
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-input border border-danger/25 bg-danger-soft p-3 text-xs font-medium text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tm(error)}</span>
          </div>
        )}

        <fieldset className="space-y-1.5" disabled={loading}>
          <legend className="text-xs font-semibold text-gray-700">{t('feedback.labels.status')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setStatus(option)}
                aria-pressed={status === option}
                className={cn(
                  'min-h-10 rounded-input border p-2.5 text-center text-xs font-bold transition-colors',
                  status === option
                    ? 'border-primary bg-primary-soft text-gray-900 ring-2 ring-primary'
                    : 'border-border bg-white text-gray-700 hover:bg-gray-50',
                )}
              >
                {statusOptionLabel(option)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700" htmlFor={`resolve-note-${feedbackId}`}>
            {t('feedback.resolve.noteLabel')}
          </label>
          <Textarea
            id={`resolve-note-${feedbackId}`}
            rows={3}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder={t('feedback.resolve.notePlaceholder')}
            disabled={loading}
          />
          <p className="text-xs text-muted">{t('feedback.resolve.noteHint')}</p>
        </div>
      </div>
    </Modal>
  );
}
