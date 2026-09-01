import { requireActiveBusiness } from '@/lib/auth/guards';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { SyncCenterView } from '@/components/sync/sync-center-view';

export default async function SyncCenterPage() {
  const { business } = await requireActiveBusiness();

  return (
    <div className="max-w-6xl mx-auto">
      <SyncCenterView businessId={business.id} />
    </div>
  );
}
