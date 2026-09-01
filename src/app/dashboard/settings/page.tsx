import { requireActiveBusiness } from '@/lib/auth/guards';
import { SettingsHubView } from '@/components/settings/settings-hub-view';

export default async function SettingsHubPage() {
  const { user, business, membership } = await requireActiveBusiness();

  const isOwner = membership.role === 'OWNER';
  const isManager = membership.role === 'MANAGER';

  return (
    <div className="py-2">
      <SettingsHubView isOwner={isOwner} isManager={isManager} />
    </div>
  );
}
