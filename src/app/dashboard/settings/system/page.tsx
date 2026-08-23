import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getSystemDiagnostics } from '@/services/settings/system-health';
import { SystemInfoView } from '@/components/settings/system-info-view';
import { redirect } from 'next/navigation';

export default async function SystemInfoPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  const diagnostics = await getSystemDiagnostics(business.id);

  return (
    <div className="py-2">
      <SystemInfoView diagnostics={diagnostics} />
    </div>
  );
}
