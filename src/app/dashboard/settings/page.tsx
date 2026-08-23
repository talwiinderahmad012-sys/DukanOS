import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { SettingsHubView } from '@/components/settings/settings-hub-view';
import { redirect } from 'next/navigation';

export default async function SettingsHubPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  const isOwner = membership.role === 'OWNER';
  const isManager = membership.role === 'MANAGER';

  return (
    <div className="py-2">
      <SettingsHubView isOwner={isOwner} isManager={isManager} />
    </div>
  );
}
