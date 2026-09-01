import { requireActiveBusiness } from '@/lib/auth/guards';
import { getOrCreateBusinessSettings } from '@/services/settings/business-settings';
import { InventorySettingsForm } from '@/components/settings/inventory-settings-form';
import { redirect } from 'next/navigation';

export default async function InventorySettingsPage() {
  const { business, membership } = await requireActiveBusiness();
  if (membership.role !== 'OWNER') redirect('/dashboard/settings');
  const { settings } = await getOrCreateBusinessSettings(business.id);
  return <div className="py-2"><InventorySettingsForm businessId={business.id} initialSettings={settings} /></div>;
}
