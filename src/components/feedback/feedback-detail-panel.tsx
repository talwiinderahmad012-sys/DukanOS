'use client';

import { useState } from 'react';
import {
  X,
  Star,
  MessageSquare,
  Lock,
  Send,
  Loader2,
  FileText,
  Package,
  User,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
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

const TYPE_STYLES: Record<string, string> = {
  FEEDBACK: 'bg-blue-100 text-blue-800',
  COMPLAINT: 'bg-red-100 text-red-800',
  REVIEW: 'bg-amber-100 text-amber-900',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-200 text-gray-700',
};

export function FeedbackDetailPanel({
  record,
  role,
  isOwnerOrManager,
  onClose,
}: {
  record: any;
  role: string;
  isOwnerOrManager: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isInternalResponse, setIsInternalResponse] = useState(false);
  const [channel, setChannel] = useState<CommunicationChannel>('WHATSAPP');
  const [notesText, setNotesText] = useState<string>(record.internalNotes || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.success) setError(res.message || 'Action failed.');
    return res;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_STYLES[record.type] || 'bg-gray-100'}`}>
                {record.type}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[record.status] || 'bg-gray-100'}`}>
                {record.status.replace('_', ' ')}
              </span>
              {record.rating != null && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-900">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {record.rating}/5
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 leading-snug break-words">{record.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{record.description}</p>

          {/* Linked entities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {record.customer && (
              <a href={`/dashboard/customers/${record.customer.id}`} className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors space-y-1">
                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><User className="w-3 h-3" /> Customer</span>
                <span className="text-xs font-semibold text-gray-900 block truncate">{record.customer.name}</span>
                {record.customer.phone && <span className="text-[11px] text-gray-500 block">{record.customer.phone}</span>}
              </a>
            )}
            {record.sale && (
              <a href={`/dashboard/sales/${record.sale.id}`} className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors space-y-1">
                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><FileText className="w-3 h-3" /> Sale</span>
                <span className="text-xs font-semibold text-gray-900 font-mono">#{record.sale.invoiceNumber}</span>
              </a>
            )}
            {record.product && (
              <a href={`/dashboard/inventory/${record.product.id}`} className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors space-y-1">
                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><Package className="w-3 h-3" /> Product</span>
                <span className="text-xs font-semibold text-gray-900 block truncate">{record.product.name}</span>
              </a>
            )}
          </div>

          {/* Status / Priority actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[11px] font-bold text-gray-500">Status</span>
              <select
                value={record.status}
                disabled={busy}
                onChange={(e) => run(() => updateFeedbackStatusAction(record.id, e.target.value as FeedbackWorkflowStatus))}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {WORKFLOW_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold text-gray-500">Priority</span>
              <select
                value={record.priority}
                disabled={busy}
                onChange={(e) => run(() => updateFeedbackPriorityAction(record.id, e.target.value as FeedbackPriority))}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Response history */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Responses ({record.responses?.length || 0})
            </span>
            {(record.responses || []).length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No responses yet.</p>
            ) : (
              <div className="space-y-2">
                {record.responses.map((r: any) => (
                  <div key={r.id} className={`p-3 rounded-xl border text-xs space-y-1 ${r.isInternal ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">{r.responder?.name || 'Staff'}</span>
                      {r.isInternal && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-purple-700">
                          <Lock className="w-3 h-3" /> Internal
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{r.message}</p>
                    <span className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add response */}
          <div className="space-y-2 p-3 rounded-xl border border-gray-200">
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={3}
              placeholder="Write a reply to the customer..."
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-wrap items-center gap-2 justify-between">
              {!isInternalResponse && record.customer?.phone && (
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as CommunicationChannel)}
                  className="text-[11px] border border-gray-300 rounded-lg px-2 py-1.5"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                </select>
              )}
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700">
                <input
                  type="checkbox"
                  checked={isInternalResponse}
                  disabled={!isOwnerOrManager}
                  onChange={(e) => setIsInternalResponse(e.target.checked)}
                  className="accent-purple-600"
                />
                <Lock className="w-3 h-3" /> Internal note only
              </label>
              <button
                disabled={busy || !responseText.trim()}
                onClick={() =>
                  run(async () => {
                    const res = await addFeedbackResponseAction(record.id, responseText, isInternalResponse, channel);
                    if (res.success) setResponseText('');
                    return res;
                  })
                }
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
          </div>

          {/* Internal notes — OWNER/MANAGER only */}
          {isOwnerOrManager ? (
            <div className="space-y-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 uppercase">
                <Lock className="w-3 h-3" /> Internal Notes (staff only)
              </span>
              <textarea
                value={notesText ?? ''}
                onChange={(e) => {
                  setNotesText(e.target.value);
                  setNotesDirty(true);
                }}
                rows={3}
                placeholder="Private notes for your team — never visible to customers."
                className="w-full text-xs border border-amber-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              {notesDirty && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const res = await updateFeedbackInternalNotesAction(record.id, notesText);
                      if (res.success) setNotesDirty(false);
                      return res;
                    })
                  }
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  Save Notes
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 italic">
              <ShieldAlert className="w-3.5 h-3.5" />
              Internal notes are restricted to Owner / Manager ({role}s cannot view them).
            </div>
          )}

          {/* Delete */}
          {isOwnerOrManager && (
            <button
              disabled={busy}
              onClick={() => {
                if (confirm('Delete this feedback record permanently?')) {
                  run(async () => {
                    const res = await deleteFeedbackAction(record.id);
                    if (res.success) onClose();
                    return res;
                  });
                }
              }}
              className="w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Record
            </button>
          )}
        </div>
      </div>
    </div>
  );
}