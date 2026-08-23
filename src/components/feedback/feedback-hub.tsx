'use client';

import { Star, MessageSquareWarning } from 'lucide-react';
import { FeedbackManagementView } from './feedback-management-view';
import { FeedbackDashboardView } from './feedback-dashboard-view';

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
  legacySearchParams,
}: {
  businessId: string;
  role: string;
  isOwnerOrManager: boolean;
  activeTab: 'complaints' | 'reviews';
  complaintStats: any;
  recordsData: any;
  filters: {
    search: string;
    status: string;
    priority: string;
    type: string;
    from: string;
    to: string;
    page: number;
  };
  legacyStats: any;
  legacyFeedbacksData: any;
  legacySearchParams: any;
}) {
  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="flex gap-2 bg-white border border-gray-200 rounded-2xl p-1.5 shadow-xs w-fit">
        <a
          href="/dashboard/feedback?tab=complaints"
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
            activeTab === 'complaints'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessageSquareWarning className="w-4 h-4" />
          Feedbacks &amp; Complaints
        </a>
        <a
          href="/dashboard/feedback?tab=reviews"
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
            activeTab === 'reviews'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Star className="w-4 h-4" />
          Satisfaction Reviews
        </a>
      </div>

      {activeTab === 'reviews' && legacyStats && legacyFeedbacksData ? (
        <FeedbackDashboardView
          businessId={businessId}
          stats={legacyStats}
          feedbacksData={legacyFeedbacksData}
          searchParams={legacySearchParams}
        />
      ) : (
        <FeedbackManagementView
          businessId={businessId}
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