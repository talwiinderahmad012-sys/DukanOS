'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X,
  Star,
  MessageSquare,
  Lock,
  Send,
  FileText,
  Package,
  User,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { IconButton, buttonClasses } from '@/components/ui/button';
import { inputClasses, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
// Enum values mirrored as string constants + type-only import — the generated
// Prisma client must never be bundled into client JS (Turbopack/node:module).
const WORKFLOW_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
import {
  addFeedbackResponseAction,
  deleteFeedbackAction,
  updateFeedbackInternalNotesAction,
  updateFeedbackPriorityAction,
  updateFeedbackStatusAction,
} from '@/app/actions/feedback-management.actions';
// Type-only import: erased at build time, never bundled into client JS.
import type {
  CommunicationChannel,
  FeedbackPriority,
  FeedbackWorkflowStatus,
} from '@/generated/prisma/client';
import type { FeedbackRecordRow } from './feedback-hub';

const TYPE_TONE: Record<string, BadgeTone> = {
  FEEDBACK: 'info',
  COMPLAINT: 'danger',
  REVIEW: 'warning',
};

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  REJECTED: 'neutral',
};

export function FeedbackDetailPanel({
  record,
  role,
  isOwnerOrManager,
  onClose,
}: {
  record: FeedbackRecordRow;
  role: string;
  isOwnerOrManager: boolean;
  onClose: () => void;
}) {
  const { t, tm, language } = useTranslation();
  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const typeLabel = (v: string) => t(`feedback.enums.types.${v}`, v);
  const statusLabel = (v: string) => t(`feedback.enums.workflowStatuses.${v}`, v);
  const priorityLabel = (v: string) => t(`feedback.enums.priorities.${v}`, v);

  const [busy, setBusy] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isInternalResponse, setIsInternalResponse] = useState(false);
  const [channel, setChannel] = useState<CommunicationChannel>('WHATSAPP');
  const [notesText, setNotesText] = useState<string>(record.internalNotes || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const run = async (fn: () => Promise<{ success: boolean; message?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.success) setError(res.message || t('feedback.detail.actionFailed'));
    return res;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('feedback.detail.panelAria')}
        className="h-full w-full max-w-xl overflow-y-auto bg-surface shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={TYPE_TONE[record.type] ?? 'neutral'}>{typeLabel(record.type)}</Badge>
              <Badge tone={STATUS_TONE[record.status] ?? 'neutral'}>{statusLabel(record.status)}</Badge>
              <Badge tone={record.priority === 'CRITICAL' ? 'danger' : record.priority === 'HIGH' ? 'warning' : 'neutral'}>
                {priorityLabel(record.priority)}
              </Badge>
              {record.rating != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  {record.rating}/5
                </span>
              )}
            </div>
            <h2 className="break-words text-base font-bold leading-snug text-gray-900">{record.title}</h2>
          </div>
          <IconButton aria-label={t('ui.closeDialog')} onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="space-y-5 p-5">
          {error && (
            <div role="alert" className="rounded-input border border-danger/25 bg-danger-soft p-3 text-xs font-medium text-danger">
              {tm(error)}
            </div>
          )}

          {/* Description */}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{record.description}</p>

          {/* Linked entities */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {record.customer && (
              <Link
                href={`/dashboard/customers/${record.customer.id}`}
                className="space-y-1 rounded-input border border-border bg-surface p-3 transition-colors hover:border-border-strong"
              >
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted">
                  <User className="h-3 w-3" aria-hidden="true" /> {t('feedback.labels.customer')}
                </span>
                <span className="block truncate text-xs font-semibold text-gray-900">
                  {record.customer.name || t('feedback.management.anonymous')}
                </span>
                {record.customer.phone && <span className="block text-xs text-muted">{record.customer.phone}</span>}
              </Link>
            )}
            {record.sale && (
              <Link
                href={`/dashboard/sales/${record.sale.id}`}
                className="space-y-1 rounded-input border border-border bg-surface p-3 transition-colors hover:border-border-strong"
              >
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted">
                  <FileText className="h-3 w-3" aria-hidden="true" /> {t('feedback.labels.sale')}
                </span>
                <span className="font-mono text-xs font-semibold text-gray-900">#{record.sale.invoiceNumber}</span>
              </Link>
            )}
            {record.product && (
              <Link
                href={`/dashboard/inventory/${record.product.id}`}
                className="space-y-1 rounded-input border border-border bg-surface p-3 transition-colors hover:border-border-strong"
              >
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted">
                  <Package className="h-3 w-3" aria-hidden="true" /> {t('feedback.labels.product')}
                </span>
                <span className="block truncate text-xs font-semibold text-gray-900">{record.product.name}</span>
              </Link>
            )}
          </div>

          {/* Status / Priority actions */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-700">{t('feedback.labels.status')}</span>
              <Select
                value={record.status}
                disabled={busy}
                onChange={(e) => run(() => updateFeedbackStatusAction(record.id, e.target.value as FeedbackWorkflowStatus))}
              >
                {WORKFLOW_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-700">{t('feedback.labels.priority')}</span>
              <Select
                value={record.priority}
                disabled={busy}
                onChange={(e) => run(() => updateFeedbackPriorityAction(record.id, e.target.value as FeedbackPriority))}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{priorityLabel(p)}</option>
                ))}
              </Select>
            </label>
          </div>

          {/* Response history */}
          <div className="space-y-2">
            <span className="flex items-center gap-1 text-xs font-bold uppercase text-muted">
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {t('feedback.detail.responses', { count: record.responses?.length || 0 })}
            </span>
            {(record.responses || []).length === 0 ? (
              <p className="py-2 text-xs text-muted">{t('feedback.detail.noResponses')}</p>
            ) : (
              <div className="space-y-2">
                {record.responses.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      'space-y-1 rounded-input border p-3 text-xs',
                      r.isInternal ? 'border-primary/25 bg-primary-soft' : 'border-border bg-gray-50',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">{r.responder?.name || t('feedback.detail.staff')}</span>
                      {r.isInternal && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                          <Lock className="h-3 w-3" aria-hidden="true" /> {t('feedback.detail.internal')}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-gray-700">{r.message}</p>
                    <span className="text-[10px] text-muted">{new Date(r.createdAt).toLocaleString(dateLocale)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add response */}
          <div className="space-y-2 rounded-input border border-border p-3">
            <label className="sr-only" htmlFor={`feedback-reply-${record.id}`}>
              {t('feedback.detail.replyPlaceholder')}
            </label>
            <textarea
              id={`feedback-reply-${record.id}`}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={3}
              placeholder={t('feedback.detail.replyPlaceholder')}
              className={inputClasses()}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {!isInternalResponse && record.customer?.phone && (
                <>
                  <label className="sr-only" htmlFor={`feedback-channel-${record.id}`}>
                    {t('feedback.detail.channelAria')}
                  </label>
                  <Select
                    id={`feedback-channel-${record.id}`}
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as CommunicationChannel)}
                    className="w-auto text-xs"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS</option>
                  </Select>
                </>
              )}
              <label className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <input
                  type="checkbox"
                  checked={isInternalResponse}
                  disabled={!isOwnerOrManager}
                  onChange={(e) => setIsInternalResponse(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-gray-300 accent-primary"
                />
                <Lock className="h-3 w-3" aria-hidden="true" /> {t('feedback.detail.internalNoteOnly')}
              </label>
              <button
                type="button"
                disabled={busy || !responseText.trim()}
                onClick={() =>
                  run(async () => {
                    const res = await addFeedbackResponseAction(record.id, responseText, isInternalResponse, channel);
                    if (res.success) setResponseText('');
                    return res;
                  })
                }
                className={buttonClasses('primary', 'sm')}
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                {t('common.send')}
              </button>
            </div>
          </div>

          {/* Internal notes — OWNER/MANAGER only */}
          {isOwnerOrManager ? (
            <div className="space-y-2 rounded-input border border-warning/25 bg-warning-soft p-3">
              <span className="flex items-center gap-1 text-xs font-bold uppercase text-gray-900">
                <Lock className="h-3 w-3" aria-hidden="true" /> {t('feedback.detail.internalNotesTitle')}
              </span>
              <label className="sr-only" htmlFor={`feedback-notes-${record.id}`}>
                {t('feedback.detail.internalNotesTitle')}
              </label>
              <textarea
                id={`feedback-notes-${record.id}`}
                value={notesText ?? ''}
                onChange={(e) => {
                  setNotesText(e.target.value);
                  setNotesDirty(true);
                }}
                rows={3}
                placeholder={t('feedback.detail.internalNotesPlaceholder')}
                className={inputClasses()}
              />
              {notesDirty && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const res = await updateFeedbackInternalNotesAction(record.id, notesText);
                      if (res.success) setNotesDirty(false);
                      return res;
                    })
                  }
                  className={buttonClasses('secondary', 'sm')}
                >
                  {t('feedback.detail.saveNotes')}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs italic text-muted">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {t('feedback.detail.internalNotesRestricted', { role })}
            </div>
          )}

          {/* Delete */}
          {isOwnerOrManager && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm(t('feedback.detail.deleteConfirm'))) {
                  run(async () => {
                    const res = await deleteFeedbackAction(record.id);
                    if (res.success) onClose();
                    return res;
                  });
                }
              }}
              className={buttonClasses('outline', 'md', 'w-full border-danger/25 text-danger hover:bg-danger-soft hover:text-danger')}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('feedback.detail.deleteRecord')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
