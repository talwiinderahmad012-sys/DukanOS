'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { LeavesBoard } from '@/components/employees/leaves-board';
import { useTranslation } from '@/lib/i18n/language-context';

export type LeavesBoardData = {
  leaves: {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string;
    status: string;
    approvalNotes: string | null;
    employee: {
      id: string;
      name: string;
      employeeCode: string;
      position: string;
    };
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export function LeavesPageClient({
  businessId,
  initialData,
  currentStatus,
}: {
  businessId: string;
  initialData: LeavesBoardData;
  currentStatus: string;
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
          <h1 className="text-2xl font-bold text-gray-900">{t('employees.leaveManagement')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('employees.leavesPageDescription')}</p>
        </div>
      </div>

      <LeavesBoard businessId={businessId} initialData={initialData} currentStatus={currentStatus} />
    </div>
  );
}
