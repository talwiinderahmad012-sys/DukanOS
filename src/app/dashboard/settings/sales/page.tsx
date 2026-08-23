import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getOrCreateBusinessSettings } from '@/services/settings/business-settings';
import { SalesSettingsForm } from '@/components/settings/sales-settings-form';
import { redirect } from 'next/navigation';

export default async function SalesSettingsPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  if (membership.role !== 'OWNER') {
    redirect('/dashboard/settings');
  }

  const { settings } = await getOrCreateBusinessSettings(business.id);

  return (
    <div className="py-2">
      <SalesSettingsForm businessId={business.id} initialSettings={settings} />
    </div>
  );
}
