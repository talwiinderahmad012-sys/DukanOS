import { requireActiveBusiness } from '@/lib/auth/guards';
import { getOrCreateBusinessSettings } from '@/services/settings/business-settings';
import { ReceiptsSettingsForm } from '@/components/settings/receipts-settings-form';
import { redirect } from 'next/navigation';

export default async function ReceiptsSettingsPage() {
  const { user, business, membership } = await requireActiveBusiness();

  if (membership.role !== 'OWNER') {
    redirect('/dashboard/settings');
  }

  const { settings } = await getOrCreateBusinessSettings(business.id);

  return (
    <div className="py-2">
      <ReceiptsSettingsForm
        businessId={business.id}
        businessName={business.name}
        initialSettings={settings}
      />
    </div>
  );
}
