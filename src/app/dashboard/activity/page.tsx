import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getBusinessActivityFeed } from '@/services/activity';
import { ActivityFeedView } from '@/components/activity/activity-feed-view';
import { redirect } from 'next/navigation';

export default async function ActivityPage() {
  const { business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  const initialEvents = await getBusinessActivityFeed(business.id, membership.role, {
    limit: 60,
  });

  return (
    <div className="max-w-5xl mx-auto">
      <ActivityFeedView initialEvents={initialEvents} />
    </div>
  );
}
