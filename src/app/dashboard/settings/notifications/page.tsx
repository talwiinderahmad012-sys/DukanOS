import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getNotificationPreferences } from '@/services/notifications';
import { NotificationPreferencesView } from '@/components/notifications/notification-preferences-view';
import { redirect } from 'next/navigation';

export default async function NotificationPreferencesPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  const preferences = await getNotificationPreferences(user.id, business.id);
  const isOwnerOrManager =
    membership.role === 'OWNER' || membership.role === 'MANAGER';

  return (
    <div className="max-w-4xl mx-auto">
      <NotificationPreferencesView
        businessId={business.id}
        initialPreferences={preferences}
        isOwnerOrManager={isOwnerOrManager}
      />
    </div>
  );
}
