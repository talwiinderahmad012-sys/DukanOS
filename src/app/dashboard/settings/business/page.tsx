import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getOrCreateBusinessSettings } from '@/services/settings/business-settings';
import { BusinessProfileForm } from '@/components/settings/business-profile-form';
import { redirect } from 'next/navigation';

export default async function BusinessProfileSettingsPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  if (membership.role !== 'OWNER') {
    redirect('/dashboard/settings');
  }

  const { business: currentBiz, settings } = await getOrCreateBusinessSettings(business.id);

  return (
    <div className="py-2">
      <BusinessProfileForm
        businessId={business.id}
        initialBusiness={currentBiz}
        initialSettings={settings}
      />
    </div>
  );
}
