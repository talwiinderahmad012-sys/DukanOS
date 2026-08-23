import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import { CreatePayrollForm } from './create-payroll-form';

export default async function NewPayrollPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Payroll Period</h1>
        <p className="text-xs text-gray-500 mt-1">
          Define a new payroll period to calculate and distribute salaries.
        </p>
      </div>

      <CreatePayrollForm businessId={business.id} />
    </div>
  );
}
