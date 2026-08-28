import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listEmployeeLeaves } from '@/services/leave';
import { redirect } from 'next/navigation';
import { LeaveStatus } from '@/generated/prisma/client';
import { LeavesPageClient, type LeavesBoardData } from './leaves-page-client';

export default async function LeavesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;
  const status = (params.status || 'ALL') as LeaveStatus | 'ALL';
  const page = Number(params.page) || 1;

  const data = await listEmployeeLeaves(business.id, {
    status,
    page,
    limit: 50,
  });

  const initialData: LeavesBoardData = {
    leaves: data.leaves.map((leave) => ({
      id: leave.id,
      leaveType: leave.leaveType,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      daysCount: leave.daysCount,
      reason: leave.reason,
      status: leave.status,
      approvalNotes: leave.approvalNotes,
      employee: {
        id: leave.employee.id,
        name: leave.employee.name,
        employeeCode: leave.employee.employeeCode,
        position: leave.employee.position,
      },
    })),
    pagination: {
      total: data.pagination.total,
      page: data.pagination.page,
      limit: data.pagination.limit,
      totalPages: data.pagination.totalPages,
    },
  };

  return <LeavesPageClient businessId={business.id} initialData={initialData} currentStatus={status} />;
}
