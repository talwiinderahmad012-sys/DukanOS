import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { getEmployeeById, getMyEmployeeProfile } from '@/services/employees';
import { getEmployeeLeaveBalances } from '@/services/leave';
import { EmployeeProfileView } from '@/components/employees/employee-profile-view';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ChevronRight, CalendarDays } from 'lucide-react';

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, user, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  // Privacy guard: an employee may only open their own profile page.
  const myProfile = await getMyEmployeeProfile(business.id, user.id);
  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';
  if (!isOwnerOrManager && myProfile?.id !== id) {
    redirect('/dashboard/me');
  }

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

  const leaveBalances = isOwnerOrManager
    ? await getEmployeeLeaveBalances(business.id, id)
    : [];

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

      {/* Leave balances (owner/manager only) */}
      {isOwnerOrManager && leaveBalances.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <CalendarDays className="w-4 h-4 text-blue-600" /> Leave Balances ({new Date().getFullYear()})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {leaveBalances.map((b) => (
              <div key={b.leaveType} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{b.leaveType}</p>
                <p className="text-lg font-bold text-gray-900">{b.remaining}</p>
                <p className="text-[10px] text-gray-400">of {b.totalAllowed} days left</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
