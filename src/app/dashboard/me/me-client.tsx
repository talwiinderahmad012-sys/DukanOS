'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Wallet,
  Bell,
  ClipboardList,
  Building2,
} from 'lucide-react';
import { SelfCheckButtons } from '@/components/employees/self-check-buttons';
import { useTranslation } from '@/lib/i18n/language-context';

export type MeProfileData = {
  name: string;
  employeeCode: string;
  position: string;
  department: string | null;
  branchName: string | null;
  joiningDate: string;
  status: string;
};

export type MeAttendanceRecord = {
  id: string;
  date: string;
  status: string;
};

export type MeLeaveBalance = {
  leaveType: string;
  totalAllowed: number;
  used: number;
  remaining: number;
};

export type MeLeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  leaveType: string;
  status: string;
};

export type MeSalarySlip = {
  id: string;
  period: string;
  netSalary: number;
  paymentStatus: string;
  payrollId: string | null;
};

export type MeNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

export type MeClientProps = {
  businessId: string;
  profile: MeProfileData | null;
  year: number;
  checkedIn: boolean;
  checkedOut: boolean;
  todayAttendance: { status: string; checkIn: string | null; checkOut: string | null } | null;
  recentAttendance: MeAttendanceRecord[];
  balances: MeLeaveBalance[];
  myLeaves: MeLeaveRequest[];
  mySalaries: MeSalarySlip[];
  notifications: MeNotification[];
};

function statusColor(status: string) {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-100 text-green-700';
    case 'LATE':
      return 'bg-yellow-100 text-yellow-700';
    case 'ABSENT':
      return 'bg-red-100 text-red-700';
    case 'LEAVE':
      return 'bg-blue-100 text-gray-950';
    case 'HALF_DAY':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

const EMPLOYEE_STATUS_KEYS: Record<string, string> = {
  ACTIVE: 'me.statusActive',
  ON_LEAVE: 'me.statusOnLeave',
  SUSPENDED: 'me.statusSuspended',
  INACTIVE: 'me.statusInactive',
  LEFT: 'me.statusLeft',
};

const ATTENDANCE_STATUS_KEYS: Record<string, string> = {
  PRESENT: 'me.attendancePresent',
  ABSENT: 'me.attendanceAbsent',
  LATE: 'me.attendanceLate',
  LEAVE: 'me.attendanceLeave',
  HALF_DAY: 'me.attendanceHalfDay',
  OFF_DAY: 'me.attendanceOffDay',
};

const LEAVE_TYPE_KEYS: Record<string, string> = {
  CASUAL: 'me.leaveTypeCasual',
  SICK: 'me.leaveTypeSick',
  ANNUAL: 'me.leaveTypeAnnual',
  UNPAID: 'me.leaveTypeUnpaid',
  OTHER: 'me.leaveTypeOther',
};

const LEAVE_STATUS_KEYS: Record<string, string> = {
  PENDING: 'me.leaveStatusPending',
  APPROVED: 'me.leaveStatusApproved',
  REJECTED: 'me.leaveStatusRejected',
  CANCELLED: 'me.leaveStatusCancelled',
};

const SALARY_STATUS_KEYS: Record<string, string> = {
  PAID: 'me.salaryStatusPaid',
  PENDING: 'me.salaryStatusPending',
  CANCELLED: 'me.salaryStatusCancelled',
};

function leaveStatusClass(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-700';
    case 'REJECTED':
      return 'bg-red-100 text-red-700';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

export function MePageClient({
  businessId,
  profile,
  year,
  checkedIn,
  checkedOut,
  todayAttendance,
  recentAttendance,
  balances,
  myLeaves,
  mySalaries,
  notifications,
}: MeClientProps) {
  const { language, t, tm, formatCurrency } = useTranslation();
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const translateWithMap = (map: Record<string, string>, value: string): string =>
    map[value] ? t(map[value]) : value;

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('me.title')}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600">
            {t('me.noProfile')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('me.title')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('me.subtitle')}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-100 text-gray-950 flex items-center justify-center font-bold text-lg shrink-0">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile.name}</p>
            <p className="text-xs text-gray-500">
              {profile.employeeCode} · {profile.position}
              {profile.department ? ` · ${profile.department}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {profile.branchName ?? t('me.allBranches')}
              </span>
              <span>·</span>
              <span>
                {t('me.joinedOn', { date: new Date(profile.joiningDate).toLocaleDateString(locale) })}
              </span>
              <span>·</span>
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  profile.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {translateWithMap(EMPLOYEE_STATUS_KEYS, profile.status)}
              </span>
            </div>
          </div>
        </div>

        <SelfCheckButtons
          businessId={businessId}
          checkedIn={checkedIn}
          checkedOut={checkedOut}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <CalendarDays className="w-4 h-4 text-gray-900" /> {t('me.leaveBalanceTitle', { year })}
          </h2>
          <div className="space-y-2">
            {balances.map((b) => (
              <div key={b.leaveType} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{translateWithMap(LEAVE_TYPE_KEYS, b.leaveType)}</span>
                <span className="text-gray-900 font-medium">
                  {t('me.daysLeft', { remaining: b.remaining, total: b.totalAllowed })}
                  {b.used > 0 && (
                    <span className="text-gray-400 font-normal"> {t('me.usedDays', { count: b.used })}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">{t('me.myRequests')}</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {myLeaves.length === 0 && (
              <p className="text-xs text-gray-400">{t('me.noLeaveRequests')}</p>
            )}
            {myLeaves.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">
                  {new Date(leave.startDate).toLocaleDateString(locale)} –{' '}
                  {new Date(leave.endDate).toLocaleDateString(locale)} · {t('me.dayCountShort', { count: leave.daysCount })}{' '}
                  {translateWithMap(LEAVE_TYPE_KEYS, leave.leaveType)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-medium ${leaveStatusClass(leave.status)}`}
                >
                  {translateWithMap(LEAVE_STATUS_KEYS, leave.status)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <ClipboardList className="w-4 h-4 text-gray-900" /> {t('me.attendanceTitle')}
          </h2>
          {todayAttendance && (
            <p className="text-xs text-gray-500 mb-3">
              {t('me.todayLabel')}{' '}
              <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor(todayAttendance.status)}`}>
                {translateWithMap(ATTENDANCE_STATUS_KEYS, todayAttendance.status)}
              </span>
              {todayAttendance.checkIn && (
                <span> · {t('me.checkInLabel', { time: new Date(todayAttendance.checkIn).toLocaleTimeString(locale) })}</span>
              )}
              {todayAttendance.checkOut && (
                <span> · {t('me.checkOutLabel', { time: new Date(todayAttendance.checkOut).toLocaleTimeString(locale) })}</span>
              )}
            </p>
          )}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {recentAttendance.length === 0 && (
              <p className="text-xs text-gray-400">{t('me.noAttendanceMonth')}</p>
            )}
            {recentAttendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{new Date(record.date).toLocaleDateString(locale)}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor(record.status)}`}>
                  {translateWithMap(ATTENDANCE_STATUS_KEYS, record.status)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <Wallet className="w-4 h-4 text-gray-900" /> {t('me.salaryTitle')}
          </h2>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {mySalaries.length === 0 && (
              <p className="text-xs text-gray-400">{t('me.noSalaryRecords')}</p>
            )}
            {mySalaries.map((slip) => (
              <Link
                href={slip.payrollId ? `/dashboard/payroll/${slip.payrollId}` : '/dashboard/me'}
                key={slip.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-1 -mx-1"
              >
                <span className="text-gray-700 font-medium">{slip.period}</span>
                <span className="text-end">
                  <span className="block text-gray-900 font-semibold">
                    {formatCurrency(slip.netSalary)}
                  </span>
                  <span
                    className={`text-[10px] ${
                      slip.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {translateWithMap(SALARY_STATUS_KEYS, slip.paymentStatus)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <Bell className="w-4 h-4 text-gray-900" /> {t('me.notificationsTitle')}
          </h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-xs text-gray-400">{t('me.noNotifications')}</p>
            )}
            {notifications.map((n) => (
              <div key={n.id} className="text-xs py-1.5 border-b border-gray-50 last:border-0">
                <p className="font-medium text-gray-800">{tm(n.title)}</p>
                <p className="text-gray-500">{tm(n.message)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(n.createdAt).toLocaleString(locale)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
