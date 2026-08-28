'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  AlertTriangle,
  Plus,
  Search,
  SearchX,
  MessageSquareWarning,
  MessageSquare,
  User,
  FileText,
  Package,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { inputClasses, Select, Input, Textarea, Field } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/components/ui/cn';
import { createFeedbackAction } from '@/app/actions/feedback-management.actions';
// Type-only import: erased at build time, never bundled into client JS.
import type { CustomerFeedbackType, FeedbackPriority } from '@/generated/prisma/client';
import { FeedbackDetailPanel } from './feedback-detail-panel';
import type {
  FeedbackComplaintStats,
  FeedbackHubFilters,
  FeedbackRecordsData,
} from './feedback-hub';

// Enum values mirrored as string constants — the generated Prisma client must
// never be pulled into the client bundle (Turbopack/node:module constraint).
const WORKFLOW_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const FEEDBACK_TYPES = ['FEEDBACK', 'COMPLAINT', 'REVIEW'] as const;

type CustomerFeedbackTypeString = (typeof FEEDBACK_TYPES)[number];
type FeedbackPriorityString = (typeof PRIORITIES)[number];

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

const PRIORITY_TONE: Record<string, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export function FeedbackManagementView({
  role,
  isOwnerOrManager,
  stats,
  data,
  filters,
}: {
  role: string;
  isOwnerOrManager: boolean;
  stats: FeedbackComplaintStats;
  data: FeedbackRecordsData;
  filters: FeedbackHubFilters;
}) {
  const { t, language, formatNumber } = useTranslation();
  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const typeLabel = (v: string) => t(`feedback.enums.types.${v}`, v);
  const statusLabel = (v: string) => t(`feedback.enums.workflowStatuses.${v}`, v);
  const priorityLabel = (v: string) => t(`feedback.enums.priorities.${v}`, v);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const records = data?.records || [];
  const pagination = data?.pagination;
  const selected = records.find((r) => r.id === selectedId) || null;

  const hasFilters =
    filters.search !== '' ||
    filters.status !== 'ALL' ||
    filters.priority !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.from !== '' ||
    filters.to !== '';

  const statTiles = [
    { label: t('common.total'), value: formatNumber(stats.total), icon: Inbox, chip: 'bg-primary-soft text-primary' },
    { label: t('common.pending'), value: formatNumber(stats.pending), icon: Clock, chip: 'bg-warning-soft text-warning' },
    { label: t('common.resolved'), value: formatNumber(stats.resolved), icon: CheckCircle2, chip: 'bg-success-soft text-success' },
    { label: t('common.rejected'), value: formatNumber(stats.rejected), icon: XCircle, chip: 'bg-gray-100 text-gray-500' },
    {
      label: t('feedback.management.statsAvgRating'),
      value: stats.averageRating != null ? `${stats.averageRating}★` : t('common.dash'),
      icon: Star,
      chip: 'bg-warning-soft text-warning',
    },
    {
      label: t('feedback.management.statsHighPriorityOpen'),
      value: formatNumber(stats.highPriorityOpen),
      icon: AlertTriangle,
      chip: 'bg-danger-soft text-danger',
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

  const rangeStart = !pagination || pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('feedback.management.title')}
        description={t('feedback.management.subtitle')}
        actions={
          <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('feedback.management.logButton')}
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statTiles.map((tile) => (
            <div key={tile.label} className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{tile.label}</p>
                <span
                  className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tile.chip)}
                  aria-hidden="true"
                >
                  <tile.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{tile.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" action="/dashboard/feedback" aria-label={t('feedback.management.filterFormAria')} className="flex flex-col gap-2">
            <input type="hidden" name="tab" value="complaints" />
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={filters.search}
                placeholder={t('feedback.management.searchPlaceholder')}
                aria-label={t('feedback.management.searchAria')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
              <Select
                name="status"
                defaultValue={filters.status}
                aria-label={t('feedback.labels.status')}
                className="xl:w-44"
              >
                <option value="ALL">{t('common.all')} — {t('feedback.labels.status')}</option>
                {WORKFLOW_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </Select>

              <Select
                name="priority"
                defaultValue={filters.priority}
                aria-label={t('feedback.labels.priority')}
                className="xl:w-44"
              >
                <option value="ALL">{t('common.all')} — {t('feedback.labels.priority')}</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{priorityLabel(p)}</option>
                ))}
              </Select>

              <Select
                name="type"
                defaultValue={filters.type}
                aria-label={t('feedback.labels.type')}
                className="xl:w-44"
              >
                <option value="ALL">{t('common.all')} — {t('feedback.labels.type')}</option>
                {FEEDBACK_TYPES.map((ty) => (
                  <option key={ty} value={ty}>{typeLabel(ty)}</option>
                ))}
              </Select>

              <input
                type="date"
                name="from"
                defaultValue={filters.from}
                aria-label={t('common.fromDate')}
                title={t('common.fromDate')}
                className={inputClasses(false, 'xl:w-40')}
              />

              <input
                type="date"
                name="to"
                defaultValue={filters.to}
                aria-label={t('common.toDate')}
                title={t('common.toDate')}
                className={inputClasses(false, 'xl:w-40')}
              />

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto xl:shrink-0')}>
                {t('common.apply')}
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/feedback?tab=complaints"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto xl:shrink-0')}
                >
                  {t('common.clear')}
                </Link>
              )}
            </div>
          </form>
        </div>

        {records.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('feedback.management.noMatchTitle')}
              description={t('common.noResultsDescription')}
              action={
                <Link href="/dashboard/feedback?tab=complaints" className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={MessageSquareWarning}
              title={t('feedback.management.noRecordsTitle')}
              description={t('feedback.management.noRecordsDesc')}
              action={
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('feedback.management.logButton')}
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-border">
              {records.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    aria-label={t('feedback.management.openDetailAria', { title: f.title })}
                    className="block w-full space-y-2 p-4 text-start transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={TYPE_TONE[f.type] ?? 'neutral'}>{typeLabel(f.type)}</Badge>
                      <Badge tone={STATUS_TONE[f.status] ?? 'neutral'}>{statusLabel(f.status)}</Badge>
                      <Badge tone={PRIORITY_TONE[f.priority] ?? 'neutral'}>{priorityLabel(f.priority)}</Badge>
                      {f.rating != null && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
                          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                          {f.rating}/5
                        </span>
                      )}
                      <span className="ms-auto whitespace-nowrap text-xs text-muted">
                        {new Date(f.createdAt).toLocaleDateString(dateLocale)}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-gray-900">{f.title}</p>
                    <p className="line-clamp-2 text-sm text-muted">{f.description}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {f.customer && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" aria-hidden="true" />
                          {f.customer.name || t('feedback.management.anonymous')}
                        </span>
                      )}
                      {f.sale && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <FileText className="h-3 w-3" aria-hidden="true" />
                          #{f.sale.invoiceNumber}
                        </span>
                      )}
                      {f.product && (
                        <span className="inline-flex items-center gap-1">
                          <Package className="h-3 w-3" aria-hidden="true" />
                          {f.product.name}
                        </span>
                      )}
                      {f.responseCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                          <MessageSquare className="h-3 w-3" aria-hidden="true" />
                          {t('feedback.management.responsesCount', { count: formatNumber(f.responseCount) })}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  {t('common.showingRange', {
                    start: formatNumber(rangeStart),
                    end: formatNumber(rangeEnd),
                    total: formatNumber(pagination.total),
                  })}
                </p>
                <nav aria-label={t('feedback.management.paginationAria')} className="flex items-center gap-2">
                  {pagination.page > 1 ? (
                    <Link href={buildQuery({ page: pagination.page - 1 })} className={buttonClasses('outline', 'sm')}>
                      {t('common.previous')}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      {t('common.previous')}
                    </span>
                  )}
                  <span className="px-1 text-xs font-semibold text-gray-700">
                    {t('common.pageOf', { page: formatNumber(pagination.page), totalPages: formatNumber(pagination.totalPages) })}
                  </span>
                  {pagination.page < pagination.totalPages ? (
                    <Link href={buildQuery({ page: pagination.page + 1 })} className={buttonClasses('outline', 'sm')}>
                      {t('common.next')}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      {t('common.next')}
                    </span>
                  )}
                </nav>
              </div>
            )}
          </>
        )}
      </Card>

      {selected && (
        <FeedbackDetailPanel
          record={selected}
          role={role}
          isOwnerOrManager={isOwnerOrManager}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showCreate && (
        <CreateFeedbackModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function CreateFeedbackModal({ onClose }: { onClose: () => void }) {
  const { t, tm } = useTranslation();
  const idPrefix = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'COMPLAINT' as CustomerFeedbackTypeString,
    rating: '',
    title: '',
    description: '',
    priority: 'MEDIUM' as FeedbackPriorityString,
    customerId: '',
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
    });
    setBusy(false);
    if (res.success) onClose();
    else setError(res.message || t('feedback.management.create.failed'));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('feedback.management.create.title')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={submit}
            loading={busy}
            disabled={!form.title.trim() || !form.description.trim()}
          >
            {!busy && <Plus className="h-4 w-4" aria-hidden="true" />}
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="rounded-input border border-danger/25 bg-danger-soft p-3 text-xs font-medium text-danger">
            {tm(error)}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('feedback.labels.type')} htmlFor={`${idPrefix}-type`}>
            <Select
              id={`${idPrefix}-type`}
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
            >
              {FEEDBACK_TYPES.map((ty) => (
                <option key={ty} value={ty}>{t(`feedback.enums.types.${ty}`, ty)}</option>
              ))}
            </Select>
          </Field>

          <Field label={t('feedback.labels.priority')} htmlFor={`${idPrefix}-priority`}>
            <Select
              id={`${idPrefix}-priority`}
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{t(`feedback.enums.priorities.${p}`, p)}</option>
              ))}
            </Select>
          </Field>

          <Field label={t('feedback.management.create.ratingLabel')} htmlFor={`${idPrefix}-rating`}>
            <Input
              id={`${idPrefix}-rating`}
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(e) => set('rating', e.target.value)}
            />
          </Field>

          <Field label={t('feedback.management.create.customerLabel')} htmlFor={`${idPrefix}-customer`}>
            <Input
              id={`${idPrefix}-customer`}
              value={form.customerId}
              onChange={(e) => set('customerId', e.target.value)}
              placeholder="uuid"
              className="font-mono"
            />
          </Field>
        </div>

        <Field label={t('feedback.labels.title')} htmlFor={`${idPrefix}-title`} required>
          <Input
            id={`${idPrefix}-title`}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <Field label={t('feedback.labels.description')} htmlFor={`${idPrefix}-description`} required>
          <Textarea
            id={`${idPrefix}-description`}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
