import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listEmployees, getEmployeeDashboardStats } from '@/services/employees';
import { redirect } from 'next/navigation';
import { EmployeesPageClient } from './employees-page-client';

export default async function EmployeesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    branchId?: string;
    position?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const search = params.search;
  const status = params.status || 'ALL';

  const [stats, data] = await Promise.all([
    getEmployeeDashboardStats(business.id),
    listEmployees(business.id, {
      search,
      status: status as any,
      page,
      limit: 25,
    }),
  ]);

  const { employees, pagination } = data;

  const rows = employees.map((emp) => ({
    id: emp.id,
    employeeCode: emp.employeeCode,
    name: emp.name,
    phone: emp.phone,
    position: emp.position,
    department: emp.department,
    status: emp.status,
    todayStatus: emp.todayAttendance?.status ?? null,
  }));

  return (
    <EmployeesPageClient
      stats={{
        totalEmployees: stats.totalEmployees,
        activeEmployees: stats.activeEmployees,
        presentToday: stats.presentToday,
        absentToday: stats.absentToday,
        pendingLeaves: stats.pendingLeaves,
        openComplaints: stats.openComplaints,
      }}
      employees={rows}
      pagination={{
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      }}
      search={search || ''}
      status={status}
    />
  );
}
