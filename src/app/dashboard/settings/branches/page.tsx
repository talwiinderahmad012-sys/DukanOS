import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listBranches } from '@/services/settings/business-settings';
import { BranchesView } from '@/components/settings/branches-view';
import { redirect } from 'next/navigation';

export default async function BranchesSettingsPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
    redirect('/dashboard/settings');
  }

  const branches = await listBranches(business.id);

  return (
    <div className="py-2">
      <BranchesView businessId={business.id} initialBranches={branches} />
    </div>
  );
}
