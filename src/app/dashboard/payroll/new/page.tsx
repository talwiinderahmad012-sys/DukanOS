import { requireActiveBusiness } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { CreatePayrollView } from './create-payroll-view';

export default async function NewPayrollPage() {
  const { business, membership } = await requireActiveBusiness();

  if (membership.role !== 'OWNER') redirect('/dashboard');

  return <CreatePayrollView businessId={business.id} />;
}
