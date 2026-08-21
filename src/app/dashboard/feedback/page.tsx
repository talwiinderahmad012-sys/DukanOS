import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getFeedbackDashboardStats, listBusinessFeedback } from '@/services/feedback';
import { FeedbackDashboardView } from '@/components/feedback/feedback-dashboard-view';
import { redirect } from 'next/navigation';

export default async function FeedbackDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    rating?: string;
    category?: string;
    page?: string;
  }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const rating = params.rating ? Number(params.rating) : undefined;
  const status = (params.status || 'ALL') as any;
  const category = (params.category || 'ALL') as any;

  const [stats, feedbacksData] = await Promise.all([
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

  return (
    <div className="max-w-6xl mx-auto">
      <FeedbackDashboardView
        businessId={business.id}
        stats={stats}
        feedbacksData={feedbacksData}
        searchParams={params}
      />
    </div>
  );
}
