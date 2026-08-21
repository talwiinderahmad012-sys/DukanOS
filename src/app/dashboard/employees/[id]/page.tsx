import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { getEmployeeById } from '@/services/employees';
import { EmployeeProfileView } from '@/components/employees/employee-profile-view';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const [employeeData, auditLogs, branches] = await Promise.all([
    getEmployeeById(business.id, id).catch(() => null),
    prisma.auditLog.findMany({
      where: {
        businessId: business.id,
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true },
    }),
  ]);

  if (!employeeData) {
    notFound();
  }

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/employees" className="hover:text-blue-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Staff Directory
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-semibold">{employeeData.employee.name}</span>
      </div>

      <EmployeeProfileView
        businessId={business.id}
        employeeData={employeeData}
        auditLogs={auditLogs}
        branches={branches}
        isOwnerOrManager={isOwnerOrManager}
      />
    </div>
  );
}
