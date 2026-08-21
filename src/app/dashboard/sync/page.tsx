import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { SyncCenterView } from '@/components/sync/sync-center-view';
import { redirect } from 'next/navigation';

export default async function SyncCenterPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  return (
    <div className="max-w-6xl mx-auto">
      <SyncCenterView businessId={business.id} />
    </div>
  );
}
