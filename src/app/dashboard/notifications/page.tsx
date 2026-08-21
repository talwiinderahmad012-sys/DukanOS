import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listUserNotifications } from '@/services/notifications';
import { NotificationCenterView } from '@/components/notifications/notification-center-view';
import { redirect } from 'next/navigation';

export default async function NotificationsPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  const { notifications, total } = await listUserNotifications(
    business.id,
    user.id,
    membership.role,
    { limit: 50 }
  );

  return (
    <div className="max-w-5xl mx-auto">
      <NotificationCenterView
        businessId={business.id}
        initialNotifications={notifications}
        initialTotal={total}
      />
    </div>
  );
}
