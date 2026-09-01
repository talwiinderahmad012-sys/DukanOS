import { requireActiveBusiness } from '@/lib/auth/guards';
import { getMyEmployeeProfile } from '@/services/employees';
import { getDailyRange } from '@/lib/utils/date-utils';
import { getEmployeeLeaveBalances } from '@/services/leave';
import { getEmployeeNotifications } from '@/services/employee-notification';
import { prisma } from '@/lib/db/prisma';
import { MePageClient } from './me-client';

export default async function MyWorkspacePage() {
  const { business, user } = await requireActiveBusiness();

  const profile = await getMyEmployeeProfile(business.id, user.id);

  const year = new Date().getFullYear();

  if (!profile) {
    return (
      <MePageClient
        businessId={business.id}
        profile={null}
        year={year}
        checkedIn={false}
        checkedOut={false}
        todayAttendance={null}
        recentAttendance={[]}
        balances={[]}
        myLeaves={[]}
        mySalaries={[]}
        notifications={[]}
      />
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
      getEmployeeLeaveBalances(business.id, profile.id, year),
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
    <MePageClient
      businessId={business.id}
      profile={{
        name: profile.name,
        employeeCode: profile.employeeCode,
        position: profile.position,
        department: profile.department,
        branchName: profile.branch?.name ?? null,
        joiningDate: profile.joiningDate.toISOString(),
        status: profile.status,
      }}
      year={year}
      checkedIn={!!todayAttendance?.checkIn}
      checkedOut={!!todayAttendance?.checkOut}
      todayAttendance={
        todayAttendance
          ? {
              status: todayAttendance.status,
              checkIn: todayAttendance.checkIn?.toISOString() ?? null,
              checkOut: todayAttendance.checkOut?.toISOString() ?? null,
            }
          : null
      }
      recentAttendance={recentAttendance.map((record) => ({
        id: record.id,
        date: record.date.toISOString(),
        status: record.status,
      }))}
      balances={balances.map((b) => ({
        leaveType: b.leaveType,
        totalAllowed: b.totalAllowed,
        used: b.used,
        remaining: b.remaining,
      }))}
      myLeaves={myLeaves.map((leave) => ({
        id: leave.id,
        startDate: leave.startDate.toISOString(),
        endDate: leave.endDate.toISOString(),
        daysCount: leave.daysCount,
        leaveType: leave.leaveType,
        status: leave.status,
      }))}
      mySalaries={mySalaries.map((slip) => ({
        id: slip.id,
        period: slip.period,
        netSalary: Number(slip.netSalary),
        paymentStatus: slip.paymentStatus,
        payrollId: slip.payrollId,
      }))}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
