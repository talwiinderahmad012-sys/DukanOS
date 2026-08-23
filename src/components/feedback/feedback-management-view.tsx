'use client';

import { useState } from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  AlertTriangle,
  Plus,
  Loader2,
  MessageSquareWarning,
} from 'lucide-react';
// Enum values mirrored as string constants — the generated Prisma client must
// never be pulled into the client bundle (Turbopack/node:module constraint).
const WORKFLOW_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const FEEDBACK_TYPES = ['FEEDBACK', 'COMPLAINT', 'REVIEW'] as const;

type CustomerFeedbackTypeString = (typeof FEEDBACK_TYPES)[number];
type FeedbackPriorityString = (typeof PRIORITIES)[number];
import { createFeedbackAction } from '@/app/actions/feedback-management.actions';
// Type-only import: erased at build time, never bundled into client JS.
import type { CustomerFeedbackType, FeedbackPriority } from '@/generated/prisma/client';
import { FeedbackDetailPanel } from './feedback-detail-panel';

const TYPE_BADGE: Record<string, string> = {
  FEEDBACK: 'bg-blue-100 text-blue-800',
  COMPLAINT: 'bg-red-100 text-red-800',
  REVIEW: 'bg-amber-100 text-amber-900',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-200 text-gray-700',
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-sky-100 text-sky-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function FeedbackManagementView({
  businessId,
  role,
  isOwnerOrManager,
  stats,
  data,
  filters,
}: {
  businessId: string;
  role: string;
  isOwnerOrManager: boolean;
  stats: any;
  data: any;
  filters: any;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const records = data?.records || [];
  const pagination = data?.pagination;
  const selected = records.find((r: any) => r.id === selectedId) || null;

  const statCards = [
    { label: 'Total', value: stats.total, icon: Inbox, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-gray-500 bg-gray-100' },
    {
      label: 'Avg Rating',
      value: stats.averageRating != null ? `${stats.averageRating}★` : '—',
      icon: Star,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'High Priority Open',
      value: stats.highPriorityOpen,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
  ];

  const buildQuery = (overrides: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = {
      tab: 'complaints',
      search: filters.search || undefined,
      status: filters.status !== 'ALL' ? filters.status : undefined,
      priority: filters.priority !== 'ALL' ? filters.priority : undefined,
      type: filters.type !== 'ALL' ? filters.type : undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) q.set(k, String(v));
    });
    return `/dashboard/feedback?${q.toString()}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback &amp; Complaint Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Track customer feedback, reviews and complaints — respond and resolve with full audit trails.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Log Feedback / Complaint
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.color}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900 mt-2">{c.value}</p>
            <p className="text-[11px] text-gray-500 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form action="/dashboard/feedback" method="get" className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 items-end">
        <input type="hidden" name="tab" value="complaints" />
        <label className="space-y-1 lg:col-span-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Search</span>
          <input
            name="search"
            defaultValue={filters.search}
            placeholder="Title, customer, invoice..."
            className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
          <select name="status" defaultValue={filters.status} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2">
            <option value="ALL">All</option>
            {WORKFLOW_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Priority</span>
          <select name="priority" defaultValue={filters.priority} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2">
            <option value="ALL">All</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Type</span>
          <select name="type" defaultValue={filters.type} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2">
            <option value="ALL">All</option>
            {FEEDBACK_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">From</span>
          <input type="date" name="from" defaultValue={filters.from} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">To</span>
          <input type="date" name="to" defaultValue={filters.to} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2" />
        </label>
        <button type="submit" className="px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold lg:col-span-7">
          Apply Filters
        </button>
      </form>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs divide-y divide-gray-100">
        {records.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <MessageSquareWarning className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs text-gray-400">No feedback or complaints match the current filters.</p>
          </div>
        ) : (
          records.map((f: any) => (
            <button
              key={f.id}
              onClick={() => setSelectedId(f.id)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors space-y-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_BADGE[f.type] || 'bg-gray-100 text-gray-600'}`}>
                  {f.type}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[f.status] || 'bg-gray-100 text-gray-600'}`}>
                  {f.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_BADGE[f.priority] || 'bg-gray-100'}`}>
                  {f.priority}
                </span>
                {f.rating != null && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {f.rating}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-gray-400">
                  {new Date(f.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">{f.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{f.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                {f.customer && <span>👤 {f.customer.name || 'Anonymous'}</span>}
                {f.sale && <span className="font-mono">#{f.sale.invoiceNumber}</span>}
                {f.product && <span>📦 {f.product.name}</span>}
                {(f._count?.responses || 0) > 0 && (
                  <span className="text-blue-600 font-semibold">{f._count.responses} response(s)</span>
                )}
              </div>
            </button>
          ))
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex gap-1">
              {pagination.page > 1 && (
                <a href={buildQuery({ page: pagination.page - 1 })} className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium">
                  Previous
                </a>
              )}
              {pagination.page < pagination.totalPages && (
                <a href={buildQuery({ page: pagination.page + 1 })} className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium">
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <FeedbackDetailPanel
          record={selected}
          role={role}
          isOwnerOrManager={isOwnerOrManager}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateFeedbackModal businessId={businessId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
function CreateFeedbackModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'COMPLAINT' as CustomerFeedbackTypeString,
    rating: '',
    title: '',
    description: '',
    priority: 'MEDIUM' as FeedbackPriorityString,
    customerId: '',
    saleId: '',
    productId: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await createFeedbackAction({
      type: form.type as CustomerFeedbackType,
      rating: form.rating ? Number(form.rating) : null,
      title: form.title,
      description: form.description,
      priority: form.priority as FeedbackPriority,
      customerId: form.customerId || null,
      saleId: form.saleId || null,
      productId: form.productId || null,
    });
    setBusy(false);
    if (res.success) onClose();
    else setError(res.message || 'Failed to create record.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900">Log Feedback / Complaint / Review</h3>
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-gray-500">Type</span>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2">
              {FEEDBACK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-gray-500">Priority</span>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-gray-500">Rating (1-5, optional)</span>
            <input type="number" min={1} max={5} value={form.rating} onChange={(e) => set('rating', e.target.value)} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-gray-500">Customer ID (optional)</span>
            <input value={form.customerId} onChange={(e) => set('customerId', e.target.value)} placeholder="uuid" className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2 font-mono" />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-gray-500">Title</span>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-gray-500">Description</span>
          <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !form.title.trim() || !form.description.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}