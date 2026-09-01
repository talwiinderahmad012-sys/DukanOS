import { requireActiveBusiness } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { getBranchAnalytics } from '@/services/analytics';
import { BranchesAnalyticsClient } from './branches-analytics-client';

export default async function BranchesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = params.preset || 'thisYear';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  let periodKey = 'thisYear';

  if (preset === 'thisMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    periodKey = 'thisMonth';
  } else if (preset === 'lastMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    periodKey = 'lastMonth';
  }

  const branches = await getBranchAnalytics(business.id, startDate, endDate);

  return <BranchesAnalyticsClient periodKey={periodKey} branches={branches} />;
}
