import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import { CreatePayrollView } from './create-payroll-view';

export default async function NewPayrollPage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  if (membership.role !== 'OWNER') redirect('/dashboard');

  return <CreatePayrollView businessId={business.id} />;
}
