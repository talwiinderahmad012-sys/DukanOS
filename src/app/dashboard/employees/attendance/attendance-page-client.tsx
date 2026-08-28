'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AttendanceBoard } from '@/components/employees/attendance-board';
import { useTranslation } from '@/lib/i18n/language-context';

export type AttendanceBoardData = {
  date: string;
  summary: {
    totalEmployees: number;
    presentCount: number;
    absentCount: number;
    leaveCount: number;
    unrecordedCount: number;
  };
  records: {
    employee: {
      id: string;
      name: string;
      employeeCode: string;
      position: string;
      branch: { id: string; name: string } | null;
    };
    attendance: {
      status: string;
      checkIn: string | null;
      checkOut: string | null;
    } | null;
  }[];
};

export function AttendancePageClient({
  businessId,
  initialData,
  date,
}: {
  businessId: string;
  initialData: AttendanceBoardData;
  date: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/dashboard/employees"
            className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4 me-1 rtl-flip" /> {t('employees.backToEmployees')}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('employees.dailyAttendanceBoard')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('employees.attendancePageDescription')}</p>
        </div>
      </div>

      <AttendanceBoard businessId={businessId} initialData={initialData} date={date} />
    </div>
  );
}
