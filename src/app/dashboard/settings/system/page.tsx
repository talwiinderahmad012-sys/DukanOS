import { requireActiveBusiness } from '@/lib/auth/guards';
import { getSystemDiagnostics } from '@/services/settings/system-health';
import { SystemInfoView } from '@/components/settings/system-info-view';

export default async function SystemInfoPage() {
  const { user, business, membership } = await requireActiveBusiness();

  const diagnostics = await getSystemDiagnostics(business.id);

  return (
    <div className="py-2">
      <SystemInfoView diagnostics={diagnostics} />
    </div>
  );
}
