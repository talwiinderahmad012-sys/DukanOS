import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getRemoteBusinessStatus } from '@/services/monitoring';
import { RemoteMonitoringView } from '@/components/monitoring/remote-monitoring-view';
import { redirect } from 'next/navigation';

export default async function RemoteMonitoringPage() {
  const { business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  const data = await getRemoteBusinessStatus(business.id);
  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';

  return (
    <div className="max-w-6xl mx-auto">
      <RemoteMonitoringView
        businessId={business.id}
        data={data}
        isOwnerOrManager={isOwnerOrManager}
      />
    </div>
  );
}
