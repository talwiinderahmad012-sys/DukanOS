import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { DataExportView } from '@/components/settings/data-export-view';
import { redirect } from 'next/navigation';

export default async function BackupSettingsPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  if (membership.role !== 'OWNER') {
    redirect('/dashboard/settings');
  }

  return (
    <div className="py-2">
      <DataExportView businessId={business.id} isBackupPage={true} />
    </div>
  );
}
