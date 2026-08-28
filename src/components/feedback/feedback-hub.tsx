'use client';

import Link from 'next/link';
import { Star, MessageSquareWarning } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { cn } from '@/components/ui/cn';
import { FeedbackManagementView } from './feedback-management-view';
import { FeedbackDashboardView } from './feedback-dashboard-view';

export type FeedbackHubFilters = {
  search: string;
  status: string;
  priority: string;
  type: string;
  from: string;
  to: string;
  page: number;
};

export type FeedbackComplaintStats = {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  averageRating: number | null;
  positiveCount: number;
  negativeCount: number;
  highPriorityOpen: number;
};

export type FeedbackResponseRow = {
  id: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  responder: { id: string; name: string | null } | null;
};

export type FeedbackRecordRow = {
  id: string;
  type: string;
  status: string;
  priority: string;
  rating: number | null;
  title: string;
  description: string;
  createdAt: string;
  internalNotes: string | null;
  customer: { id: string; name: string | null; phone: string | null } | null;
  sale: { id: string; invoiceNumber: string } | null;
  product: { id: string; name: string; sku: string | null } | null;
  responses: FeedbackResponseRow[];
  responseCount: number;
};

export type FeedbackRecordsData = {
  records: FeedbackRecordRow[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

export type LegacyFeedbackStats = {
  totalReviews: number;
  averageRating: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  newCount: number;
  resolvedCount: number;
  categories: { category: string; count: number; averageRating: number }[];
};

export type LegacyFeedbackRow = {
  id: string;
  rating: number;
  message: string;
  category: string;
  status: string;
  isAnonymous: boolean;
  resolutionNote: string | null;
  createdAt: string;
  customer: { id: string; name: string | null; phone: string | null } | null;
  sale: { id: string; invoiceNumber: string } | null;
};

export type LegacyFeedbacksData = {
  feedbacks: LegacyFeedbackRow[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

export type LegacyReviewFilters = {
  search: string;
  rating: string;
  status: string;
};

export function FeedbackHub({
  businessId,
  role,
  isOwnerOrManager,
  activeTab,
  complaintStats,
  recordsData,
  filters,
  legacyStats,
  legacyFeedbacksData,
  legacyFilters,
}: {
  businessId: string;
  role: string;
  isOwnerOrManager: boolean;
  activeTab: 'complaints' | 'reviews';
  complaintStats: FeedbackComplaintStats;
  recordsData: FeedbackRecordsData;
  filters: FeedbackHubFilters;
  legacyStats: LegacyFeedbackStats;
  legacyFeedbacksData: LegacyFeedbacksData;
  legacyFilters: LegacyReviewFilters;
}) {
  const { t, formatNumber } = useTranslation();

  const tabs = [
    {
      key: 'complaints' as const,
      label: t('feedback.hub.tabComplaints'),
      href: '/dashboard/feedback?tab=complaints',
      icon: MessageSquareWarning,
      count: complaintStats.total,
    },
    {
      key: 'reviews' as const,
      label: t('feedback.hub.tabReviews'),
      href: '/dashboard/feedback?tab=reviews',
      icon: Star,
      count: legacyStats.totalReviews,
    },
  ];

  return (
    <div className="space-y-6">
      <nav aria-label={t('feedback.hub.tabsAria')} className="overflow-x-auto">
        <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <li key={tab.key} className="flex-1 sm:flex-initial">
                <Link
                  href={tab.href}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors sm:h-9',
                    active ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-900',
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {tab.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                      active ? 'bg-primary-soft text-primary' : 'bg-gray-200 text-gray-600',
                    )}
                  >
                    {formatNumber(tab.count)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {activeTab === 'reviews' && legacyStats && legacyFeedbacksData ? (
        <FeedbackDashboardView
          businessId={businessId}
          stats={legacyStats}
          feedbacksData={legacyFeedbacksData}
          filters={legacyFilters}
        />
      ) : (
        <FeedbackManagementView
          role={role}
          isOwnerOrManager={isOwnerOrManager}
          stats={complaintStats}
          data={recordsData}
          filters={filters}
        />
      )}
    </div>
  );
}
