'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  MessageSquare,
  SearchX,
  CheckCircle2,
  Search,
  Edit3,
  FileText,
  Copy,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { inputClasses, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { ResolveFeedbackModal } from './resolve-feedback-modal';
import { generateFeedbackInviteAction } from '@/app/actions/feedback.actions';
import type { LegacyFeedbackRow, LegacyFeedbacksData, LegacyFeedbackStats, LegacyReviewFilters } from './feedback-hub';

const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: 'info',
  REVIEWING: 'warning',
  RESOLVED: 'success',
  ARCHIVED: 'neutral',
};

const LEGACY_STATUSES = ['NEW', 'REVIEWING', 'RESOLVED', 'ARCHIVED'] as const;

function buildReviewsHref(filters: LegacyReviewFilters, overrides: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  const merged: Record<string, string | number | undefined> = {
    tab: 'reviews',
    search: filters.search || undefined,
    rating: filters.rating || undefined,
    status: filters.status !== 'ALL' ? filters.status : undefined,
    ...overrides,
  };
  Object.entries(merged).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) q.set(k, String(v));
  });
  return `/dashboard/feedback?${q.toString()}`;
}

export function FeedbackDashboardView({
  businessId,
  stats,
  feedbacksData,
  filters,
}: {
  businessId: string;
  stats: LegacyFeedbackStats;
  feedbacksData: LegacyFeedbacksData;
  filters: LegacyReviewFilters;
}) {
  const { t, language, formatNumber } = useTranslation();
  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const statusLabel = (v: string) => t(`feedback.enums.legacyStatuses.${v}`, v);
  const { feedbacks, pagination } = feedbacksData;
  const [activeModalFeedback, setActiveModalFeedback] = useState<LegacyFeedbackRow | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const hasFilters = filters.search !== '' || filters.rating !== '' || filters.status !== 'ALL';

  const handleGenerateLink = async () => {
    setCreatingLink(true);
    const res = await generateFeedbackInviteAction(businessId, {});
    if (res.success && res.data) {
      const invite = res.data as { token: string };
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setGeneratedLink(`${origin}/feedback/${invite.token}`);
    }
    setCreatingLink(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kpiTiles = [
    {
      label: t('feedback.dashboard.averageRating'),
      value: stats.averageRating != null ? formatNumber(stats.averageRating) : t('common.dash'),
      sub: t('feedback.dashboard.totalReviews', { count: formatNumber(stats.totalReviews) }),
      icon: Star,
      chip: 'bg-warning-soft text-warning',
      valueClassName: stats.averageRating != null ? undefined : 'text-muted',
    },
    {
      label: t('feedback.dashboard.positive'),
      value: formatNumber(stats.positiveCount),
      sub: t('feedback.dashboard.positiveDesc'),
      icon: CheckCircle2,
      chip: 'bg-success-soft text-success',
      valueClassName: undefined,
    },
    {
      label: t('feedback.dashboard.neutral'),
      value: formatNumber(stats.neutralCount),
      sub: t('feedback.dashboard.neutralDesc'),
      icon: Star,
      chip: 'bg-warning-soft text-warning',
      valueClassName: undefined,
    },
    {
      label: t('feedback.dashboard.negative'),
      value: formatNumber(stats.negativeCount),
      sub: t('feedback.dashboard.negativeDesc'),
      icon: Star,
      chip: 'bg-danger-soft text-danger',
      valueClassName: undefined,
    },
    {
      label: t('feedback.dashboard.newFeedback'),
      value: formatNumber(stats.newCount),
      sub: t('feedback.dashboard.newFeedbackDesc'),
      icon: MessageSquare,
      chip: 'bg-primary-soft text-primary',
      valueClassName: undefined,
    },
  ];

  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('feedback.dashboard.title')}
        description={t('feedback.dashboard.subtitle')}
        actions={
          <Button variant="primary" size="md" onClick={handleGenerateLink} loading={creatingLink}>
            {!creatingLink && <Plus className="h-4 w-4" aria-hidden="true" />}
            {t('feedback.dashboard.createLink')}
          </Button>
        }
      />

      {generatedLink && (
        <Card className="border-primary/25 bg-primary-soft p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {t('feedback.dashboard.linkGenerated')}
              </p>
              <p className="truncate font-mono text-xs text-gray-900">{generatedLink}</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(generatedLink)}
                className={buttonClasses('outline', 'sm')}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {copied ? t('feedback.dashboard.copied') : t('feedback.dashboard.copyLink')}
              </button>
              <a
                href={generatedLink}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses('primary', 'sm')}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                {t('feedback.dashboard.open')}
              </a>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kpiTiles.map((tile) => (
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
              <div>
                <p className={cn('text-2xl font-bold leading-tight text-gray-900', tile.valueClassName)}>{tile.value}</p>
                <p className="mt-1 text-xs text-muted">{tile.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label={t('feedback.dashboard.filterFormAria')} className="flex flex-col gap-2">
            <input type="hidden" name="tab" value="reviews" />
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={filters.search}
                placeholder={t('feedback.dashboard.searchPlaceholder')}
                aria-label={t('feedback.dashboard.searchAria')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
              <Select
                name="rating"
                defaultValue={filters.rating}
                aria-label={t('feedback.dashboard.ratingFilterAria')}
                className="xl:w-44"
              >
                <option value="">{t('feedback.dashboard.allStars')}</option>
                <option value="5">{t('feedback.dashboard.nStars', { n: 5 })}</option>
                <option value="4">{t('feedback.dashboard.nStars', { n: 4 })}</option>
                <option value="3">{t('feedback.dashboard.nStars', { n: 3 })}</option>
                <option value="2">{t('feedback.dashboard.nStars', { n: 2 })}</option>
                <option value="1">{t('feedback.dashboard.oneStar')}</option>
              </Select>

              <Select
                name="status"
                defaultValue={filters.status}
                aria-label={t('feedback.dashboard.statusFilterAria')}
                className="xl:w-44"
              >
                <option value="ALL">{t('common.all')} — {t('common.status')}</option>
                {LEGACY_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </Select>

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto xl:shrink-0')}>
                {t('common.apply')}
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/feedback?tab=reviews"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto xl:shrink-0')}
                >
                  {t('common.clear')}
                </Link>
              )}
            </div>
          </form>
        </div>

        {feedbacks.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('feedback.dashboard.noMatchTitle')}
              description={t('common.noResultsDescription')}
              action={
                <Link href="/dashboard/feedback?tab=reviews" className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title={t('feedback.dashboard.emptyTitle')}
              description={t('feedback.dashboard.emptyDesc')}
              action={
                <Button variant="primary" size="sm" onClick={handleGenerateLink} loading={creatingLink}>
                  {!creatingLink && <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                  {t('feedback.dashboard.createLinkShort')}
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-border">
              {feedbacks.map((f) => (
                <li key={f.id} className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/25 bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
                        <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                        {f.rating}.0
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-900">
                          {f.isAnonymous
                            ? t('feedback.dashboard.anonymousCustomer')
                            : f.customer?.name || t('feedback.dashboard.verifiedCustomer')}
                          <span className="ms-2 font-normal text-muted">
                            ({t(`feedback.enums.categories.${f.category}.label`, f.category)})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={STATUS_TONE[f.status] ?? 'neutral'}>{statusLabel(f.status)}</Badge>
                      <button
                        type="button"
                        onClick={() => setActiveModalFeedback(f)}
                        aria-label={t('feedback.dashboard.resolveAria', {
                          name: f.isAnonymous
                            ? t('feedback.dashboard.anonymousCustomer')
                            : f.customer?.name || t('feedback.dashboard.verifiedCustomer'),
                        })}
                        className={buttonClasses('outline', 'sm')}
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('feedback.dashboard.action')}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-gray-700">&ldquo;{f.message}&rdquo;</p>

                  {f.resolutionNote && (
                    <div className="space-y-1 rounded-input border border-success/25 bg-success-soft p-3 text-xs text-gray-900">
                      <span className="flex items-center gap-1 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                        {t('feedback.dashboard.managerResolutionNote')}
                      </span>
                      <p>{f.resolutionNote}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted">
                    <span>{t('feedback.dashboard.submittedOn', { date: new Date(f.createdAt).toLocaleDateString(dateLocale) })}</span>
                    {f.sale && (
                      <Link
                        href={`/dashboard/sales/${f.sale.id}`}
                        className="inline-flex items-center gap-1 font-mono text-gray-900 hover:underline"
                      >
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        {t('feedback.dashboard.invoiceNumber', { number: f.sale.invoiceNumber })}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {pagination.totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  {t('common.showingRange', {
                    start: formatNumber(rangeStart),
                    end: formatNumber(rangeEnd),
                    total: formatNumber(pagination.total),
                  })}
                </p>
                <nav aria-label={t('feedback.dashboard.paginationAria')} className="flex items-center gap-2">
                  {pagination.page > 1 ? (
                    <Link href={buildReviewsHref(filters, { page: pagination.page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildReviewsHref(filters, { page: pagination.page + 1 })} className={buttonClasses('outline', 'sm')}>
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

      {activeModalFeedback && (
        <ResolveFeedbackModal
          businessId={businessId}
          feedbackId={activeModalFeedback.id}
          customerName={activeModalFeedback.isAnonymous ? t('feedback.management.anonymous') : activeModalFeedback.customer?.name}
          rating={activeModalFeedback.rating}
          message={activeModalFeedback.message}
          currentStatus={activeModalFeedback.status}
          currentResolution={activeModalFeedback.resolutionNote}
          isOpen={!!activeModalFeedback}
          onClose={() => setActiveModalFeedback(null)}
        />
      )}
    </div>
  );
}
