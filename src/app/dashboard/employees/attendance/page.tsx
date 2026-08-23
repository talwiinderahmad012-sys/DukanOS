import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getDailyAttendance } from '@/services/attendance';
import { redirect } from 'next/navigation';
import { AttendanceBoard } from '@/components/employees/attendance-board';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;
  const date = params.date || new Date().toISOString().slice(0, 10);

  const data = await getDailyAttendance(business.id, date);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/dashboard/employees" className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Employees
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Daily Attendance Board</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Mark attendance, track check-ins, and view daily presence for your staff.
          </p>
        </div>
      </div>

      <AttendanceBoard businessId={business.id} initialData={data} date={date} />
    </div>
  );
}
