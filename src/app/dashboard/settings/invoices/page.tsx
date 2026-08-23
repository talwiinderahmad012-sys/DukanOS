import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getOrCreateBusinessSettings } from '@/services/settings/business-settings';
import { InvoiceSettingsForm } from '@/components/settings/invoice-settings-form';
import { redirect } from 'next/navigation';

export default async function InvoiceSettingsPage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role !== 'OWNER') redirect('/dashboard/settings');
  const { settings } = await getOrCreateBusinessSettings(business.id);
  return <div className="py-2"><InvoiceSettingsForm businessId={business.id} initialSettings={settings} /></div>;
}
