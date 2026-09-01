import { requireActiveBusiness } from '@/lib/auth/guards';
import { getDailyAttendance } from '@/services/attendance';
import { AttendancePageClient, type AttendanceBoardData } from './attendance-page-client';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { business } = await requireActiveBusiness();
  const params = await searchParams;
  const date = params.date || new Date().toISOString().slice(0, 10);

  const data = await getDailyAttendance(business.id, date);

  const initialData: AttendanceBoardData = {
    date: data.date,
    summary: {
      totalEmployees: data.summary.totalEmployees,
      presentCount: data.summary.presentCount,
      absentCount: data.summary.absentCount,
      leaveCount: data.summary.leaveCount,
      unrecordedCount: data.summary.unrecordedCount,
    },
    records: data.records.map(({ employee, attendance }: any) => ({
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        position: employee.position,
        branch: employee.branch ? { id: employee.branch.id, name: employee.branch.name } : null,
      },
      attendance: attendance
        ? {
            status: attendance.status,
            checkIn: attendance.checkIn ? attendance.checkIn.toISOString() : null,
            checkOut: attendance.checkOut ? attendance.checkOut.toISOString() : null,
          }
        : null,
    })),
  };

  return <AttendancePageClient businessId={business.id} initialData={initialData} date={date} />;
}
