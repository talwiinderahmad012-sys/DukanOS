import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getFeedbackStats, listFeedbackRecords } from '@/services/feedback-management';
import { getFeedbackDashboardStats, listBusinessFeedback } from '@/services/feedback';
import { FeedbackHub } from '@/components/feedback/feedback-hub';
import { redirect } from 'next/navigation';
import { MembershipRole } from '@/generated/prisma/client';

export default async function FeedbackDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    status?: string;
    priority?: string;
    type?: string;
    rating?: string;
    category?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const rating = params.rating ? Number(params.rating) : undefined;
  const status = (params.status || 'ALL') as any;
  const category = (params.category || 'ALL') as any;
  const activeTab = (params.tab === 'reviews' ? 'reviews' : 'complaints') as 'complaints' | 'reviews';

  const role = membership.role;
  const isOwnerOrManager = role === MembershipRole.OWNER || role === MembershipRole.MANAGER;

  const [complaintStats, recordsData, legacyStats, legacyFeedbacksData] = await Promise.all([
    getFeedbackStats(business.id),
    listFeedbackRecords(business.id, role, {
      search: params.search,
      status: params.status as any,
      priority: params.priority as any,
      type: params.type as any,
      from: params.from,
      to: params.to,
      page,
      limit: 15,
    }),
    getFeedbackDashboardStats(business.id),
    listBusinessFeedback(business.id, {
      search: params.search,
      status,
      category,
      rating,
      page,
      limit: 20,
    }),
  ]);

  const filters = {
    search: params.search || '',
    status: params.status || 'ALL',
    priority: params.priority || 'ALL',
    type: params.type || 'ALL',
    from: params.from || '',
    to: params.to || '',
    page,
  };

  return (
    <div className="max-w-6xl mx-auto">
      <FeedbackHub
        businessId={business.id}
        role={role}
        isOwnerOrManager={isOwnerOrManager}
        activeTab={activeTab}
        complaintStats={complaintStats}
        recordsData={recordsData}
        filters={filters}
        legacyStats={legacyStats}
        legacyFeedbacksData={legacyFeedbacksData}
        legacySearchParams={params}
      />
    </div>
  );
}
