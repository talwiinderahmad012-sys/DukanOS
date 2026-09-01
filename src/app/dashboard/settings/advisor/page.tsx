import { requireActiveBusiness } from '@/lib/auth/guards';
import { getOrCreateBusinessSettings } from '@/services/settings/business-settings';
import { AdvisorSettingsForm } from '@/components/settings/advisor-settings-form';
import { redirect } from 'next/navigation';

export default async function AdvisorSettingsPage() {
  const { user, business, membership } = await requireActiveBusiness();

  if (membership.role !== 'OWNER') {
    redirect('/dashboard/settings');
  }

  const { settings } = await getOrCreateBusinessSettings(business.id);

  return (
    <div className="py-2">
      <AdvisorSettingsForm businessId={business.id} initialSettings={settings} />
    </div>
  );
}
