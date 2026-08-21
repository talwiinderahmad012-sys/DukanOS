import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listUserConversations } from '@/services/communications';
import { listAnnouncements } from '@/services/announcements';
import { CommunicationsView } from '@/components/communications/communications-view';
import { redirect } from 'next/navigation';

export default async function CommunicationsPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  const [initialConversations, initialAnnouncements] = await Promise.all([
    listUserConversations(business.id, user.id),
    listAnnouncements(business.id, user.id, membership.role),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <CommunicationsView
        businessId={business.id}
        currentUserId={user.id}
        userRole={membership.role}
        initialConversations={initialConversations}
        initialAnnouncements={initialAnnouncements}
      />
    </div>
  );
}
