import { requireActiveBusiness } from '@/lib/auth/guards';
import { getBusinessActivityFeed } from '@/services/activity';
import { ActivityFeedView } from '@/components/activity/activity-feed-view';

export default async function ActivityPage() {
  const { business, membership } = await requireActiveBusiness();

  const initialEvents = await getBusinessActivityFeed(business.id, membership.role, {
    limit: 60,
  });

  return (
    <div className="max-w-5xl mx-auto">
      <ActivityFeedView initialEvents={initialEvents} />
    </div>
  );
}
