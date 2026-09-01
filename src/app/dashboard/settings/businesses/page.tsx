import { requireActiveBusiness } from '@/lib/auth/guards';
import { listUserBusinesses } from '@/services/business/context';
import { BusinessManagementView } from '@/components/business/business-management-view';

export const metadata = {
  title: 'My Businesses | DukaanOS Settings',
};

export default async function BusinessesPage() {
  const { user, business: activeBusiness } = await requireActiveBusiness();
  const userBusinesses = await listUserBusinesses(user.id);

  return (
    <BusinessManagementView
      businesses={userBusinesses}
      activeBusinessId={activeBusiness.id}
      currentUserId={user.id}
    />
  );
}
