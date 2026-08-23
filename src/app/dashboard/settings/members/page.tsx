import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listBusinessMembers } from '@/services/settings/members';
import { MembersView } from '@/components/settings/members-view';
import { redirect } from 'next/navigation';

export default async function MembersSettingsPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  if (membership.role !== 'OWNER') {
    redirect('/dashboard/settings');
  }

  const members = await listBusinessMembers(business.id);

  return (
    <div className="py-2">
      <MembersView
        businessId={business.id}
        initialMembers={members}
        currentUserId={user.id}
      />
    </div>
  );
}
