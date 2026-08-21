import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { EmployeeForm } from '@/components/employees/employee-form';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export default async function NewEmployeePage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const branches = await prisma.branch.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/employees" className="hover:text-blue-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Staff Directory
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-semibold">New Employee Registration</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Staff Member</h1>
        <p className="text-xs text-gray-500 mt-1">
          Create an official employee profile with position, branch assignment, and salary settings.
        </p>
      </div>

      <EmployeeForm businessId={business.id} branches={branches} />
    </div>
  );
}
