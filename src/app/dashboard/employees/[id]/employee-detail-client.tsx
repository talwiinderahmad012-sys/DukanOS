'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { EmployeeProfileView } from '@/components/employees/employee-profile-view';
import { useTranslation } from '@/lib/i18n/language-context';

export type SerializedEmployeeData = {
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    position: string;
    department: string | null;
    joiningDate: string;
    status: string;
    salaryType: string;
    basicSalary: number;
    notes: string | null;
    branch: { id: string; name: string } | null;
    attendances: {
      id: string;
      date: string;
      status: string;
      checkIn: string | null;
      checkOut: string | null;
      notes: string | null;
    }[];
    leaves: {
      id: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      daysCount: number;
      reason: string;
      approvalNotes: string | null;
      status: string;
    }[];
    salaries: {
      id: string;
      period: string;
      baseSalary: number;
      overtime: number;
      bonus: number;
      deductions: number;
      advance: number;
      netSalary: number;
      paymentStatus: string;
    }[];
    complaints: {
      id: string;
      title: string;
      category: string;
      priority: string;
      status: string;
      description: string;
      resolutionNote: string | null;
      createdAt: string;
    }[];
  };
  stats: {
    totalLoggedDays: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    leaveCount: number;
    attendanceRate: number;
    approvedLeavesCount: number;
    pendingComplaintsCount: number;
  };
};

export type SerializedAuditLog = {
  id: string;
  action: string;
  metadata: string | null;
  createdAt: string;
};

export type SerializedLeaveBalance = {
  leaveType: string;
  year: number;
  totalAllowed: number;
  used: number;
  remaining: number;
};

const LEAVE_TYPE_KEY: Record<string, string> = {
  CASUAL: 'employees.casualLeave',
  SICK: 'employees.sickLeave',
  ANNUAL: 'employees.annualLeave',
  UNPAID: 'employees.unpaidLeave',
  OTHER: 'employees.otherEmergencyLeave',
};

export function EmployeeDetailClient({
  businessId,
  employeeData,
  auditLogs,
  branches,
  isOwnerOrManager,
  leaveBalances,
  currentYear,
}: {
  businessId: string;
  employeeData: SerializedEmployeeData;
  auditLogs: SerializedAuditLog[];
  branches: { id: string; name: string }[];
  isOwnerOrManager: boolean;
  leaveBalances: SerializedLeaveBalance[];
  currentYear: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/employees"
          className="hover:text-gray-900 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4 rtl-flip" /> {t('employees.staffDirectory')}
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400 rtl-flip" />
        <span className="text-gray-900 font-semibold">{employeeData.employee.name}</span>
      </div>

      {isOwnerOrManager && leaveBalances.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <CalendarDays className="w-4 h-4 text-gray-900" />{' '}
            {t('employees.leaveBalancesYear', { year: currentYear })}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {leaveBalances.map((b) => (
              <div key={b.leaveType} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">
                  {t(LEAVE_TYPE_KEY[b.leaveType] ?? 'common.unknown')}
                </p>
                <p className="text-lg font-bold text-gray-900">{b.remaining}</p>
                <p className="text-[10px] text-gray-400">{t('employees.daysLeftOf', { total: b.totalAllowed })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmployeeProfileView
        businessId={businessId}
        employeeData={employeeData}
        auditLogs={auditLogs}
        branches={branches}
        isOwnerOrManager={isOwnerOrManager}
      />
    </div>
  );
}
