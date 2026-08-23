import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getMyEmployeeProfile } from '@/services/employees';
import { getDailyRange } from '@/lib/utils/date-utils';
import { getEmployeeLeaveBalances } from '@/services/leave';
import { getEmployeeNotifications } from '@/services/employee-notification';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  Wallet,
  Bell,
  ClipboardList,
  Building2,
} from 'lucide-react';
import { SelfCheckButtons } from '@/components/employees/self-check-buttons';

function statusColor(status: string) {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-100 text-green-700';
    case 'LATE':
      return 'bg-yellow-100 text-yellow-700';
    case 'ABSENT':
      return 'bg-red-100 text-red-700';
    case 'LEAVE':
      return 'bg-blue-100 text-blue-700';
    case 'HALF_DAY':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export default async function MyWorkspacePage() {
  const { business, user } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const profile = await getMyEmployeeProfile(business.id, user.id);

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">My Workspace</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600">
            No employee profile is linked to your account yet. Ask your shop owner or manager to link
            your account to your staff record.
          </p>
        </div>
      </div>
    );
  }

  const today = getDailyRange();
  const monthStart = new Date(today.start.getFullYear(), today.start.getMonth(), 1);

  const [todayAttendance, recentAttendance, balances, myLeaves, mySalaries, notifications] =
    await Promise.all([
      prisma.employeeAttendance.findFirst({
        where: {
          businessId: business.id,
          employeeId: profile.id,
          date: { gte: today.start, lte: today.end },
        },
      }),
      prisma.employeeAttendance.findMany({
        where: { businessId: business.id, employeeId: profile.id, date: { gte: monthStart } },
        orderBy: { date: 'desc' },
        take: 15,
      }),
      getEmployeeLeaveBalances(business.id, profile.id),
      prisma.employeeLeave.findMany({
        where: { businessId: business.id, employeeId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.employeeSalary.findMany({
        where: { businessId: business.id, employeeId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      getEmployeeNotifications(business.id, user.id, 10),
    ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Workspace</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Your attendance, leave balance, salary slips and notifications — all in one place.
        </p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
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
                {profile.branch ? profile.branch.name : 'All branches'}
              </span>
              <span>·</span>
              <span>Joined {new Date(profile.joiningDate).toLocaleDateString()}</span>
              <span>·</span>
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  profile.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {profile.status}
              </span>
            </div>
          </div>
        </div>

        {/* Self check-in/out */}
        <SelfCheckButtons
          businessId={business.id}
          checkedIn={!!todayAttendance?.checkIn}
          checkedOut={!!todayAttendance?.checkOut}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave balances + requests */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <CalendarDays className="w-4 h-4 text-blue-600" /> Leave Balance ({new Date().getFullYear()})
          </h2>
          <div className="space-y-2">
            {balances.map((b) => (
              <div key={b.leaveType} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{b.leaveType}</span>
                <span className="text-gray-900 font-medium">
                  {b.remaining} / {b.totalAllowed} days left
                  {b.used > 0 && (
                    <span className="text-gray-400 font-normal"> ({b.used} used)</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">My Requests</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {myLeaves.length === 0 && (
              <p className="text-xs text-gray-400">No leave requests yet.</p>
            )}
            {myLeaves.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">
                  {new Date(leave.startDate).toLocaleDateString()} –{' '}
                  {new Date(leave.endDate).toLocaleDateString()} · {leave.daysCount}d{' '}
                  {leave.leaveType.toLowerCase()}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    leave.status === 'APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : leave.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : leave.status === 'CANCELLED'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {leave.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Attendance this month */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <ClipboardList className="w-4 h-4 text-blue-600" /> My Attendance
          </h2>
          {todayAttendance && (
            <p className="text-xs text-gray-500 mb-3">
              Today:{' '}
              <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor(todayAttendance.status)}`}>
                {todayAttendance.status}
              </span>
              {todayAttendance.checkIn && (
                <span> · In {new Date(todayAttendance.checkIn).toLocaleTimeString()}</span>
              )}
              {todayAttendance.checkOut && (
                <span> · Out {new Date(todayAttendance.checkOut).toLocaleTimeString()}</span>
              )}
            </p>
          )}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {recentAttendance.length === 0 && (
              <p className="text-xs text-gray-400">No attendance recorded this month.</p>
            )}
            {recentAttendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{new Date(record.date).toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor(record.status)}`}>
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Salary slips */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <Wallet className="w-4 h-4 text-blue-600" /> My Salary Slips
          </h2>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {mySalaries.length === 0 && (
              <p className="text-xs text-gray-400">No salary records yet.</p>
            )}
            {mySalaries.map((slip) => (
              <Link
                href={slip.payrollId ? `/dashboard/payroll/${slip.payrollId}` : '/dashboard/me'}
                key={slip.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-1 -mx-1"
              >
                <span className="text-gray-700 font-medium">{slip.period}</span>
                <span className="text-right">
                  <span className="block text-gray-900 font-semibold">
                    Rs {slip.netSalary.toLocaleString()}
                  </span>
                  <span
                    className={`text-[10px] ${
                      slip.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {slip.paymentStatus}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <Bell className="w-4 h-4 text-blue-600" /> Notifications
          </h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-xs text-gray-400">No notifications.</p>
            )}
            {notifications.map((n) => (
              <div key={n.id} className="text-xs py-1.5 border-b border-gray-50 last:border-0">
                <p className="font-medium text-gray-800">{n.title}</p>
                <p className="text-gray-500">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}