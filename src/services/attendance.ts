import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { AttendanceStatus } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { getDailyRange, getMonthlyRange } from '@/lib/utils/date-utils';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';

export async function recordAttendance(
  businessId: string,
  recordedBy: string,
  data: {
    employeeId: string;
    date?: string | Date;
    status: AttendanceStatus;
    checkIn?: string | Date | null;
    checkOut?: string | Date | null;
    notes?: string | null;
    branchId?: string | null;
  }
) {
  // 1. Verify employee belongs to business
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, businessId },
  });

  if (!employee) {
    throw new Error('Employee not found or unauthorized.');
  }

  // 2. Normalize date to calendar day boundary
  const dayRange = getDailyRange(data.date);
  const normalizedDate = dayRange.start;

  // Detect whether this is a fresh record or a manual correction of an
  // existing one - corrections must be audited distinctly.
  const existing = await prisma.employeeAttendance.findUnique({
    where: {
      businessId_employeeId_date: {
        businessId,
        employeeId: data.employeeId,
        date: normalizedDate,
      },
    },
    select: { id: true, status: true },
  });

  // 3. Upsert attendance record (enforcing 1 record per employee per day)
  const attendance = await prisma.employeeAttendance.upsert({
    where: {
      businessId_employeeId_date: {
        businessId,
        employeeId: data.employeeId,
        date: normalizedDate,
      },
    },
    update: {
      status: data.status,
      checkIn: data.checkIn ? new Date(data.checkIn) : undefined,
      checkOut: data.checkOut ? new Date(data.checkOut) : undefined,
      notes: data.notes?.trim() || null,
      branchId: data.branchId || employee.branchId,
      recordedBy,
    },
    create: {
      businessId,
      employeeId: data.employeeId,
      branchId: data.branchId || employee.branchId,
      date: normalizedDate,
      status: data.status,
      checkIn: data.checkIn ? new Date(data.checkIn) : null,
      checkOut: data.checkOut ? new Date(data.checkOut) : null,
      notes: data.notes?.trim() || null,
      recordedBy,
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, position: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId: recordedBy,
    branchId: attendance.branchId,
    action: existing ? 'ATTENDANCE_MANUAL_OVERRIDE' : 'ATTENDANCE_RECORDED',
    entityType: 'EmployeeAttendance',
    entityId: attendance.id,
    metadata: {
      employeeId: employee.id,
      employeeName: employee.name,
      date: dayRange.dateStr,
      previousStatus: existing?.status ?? null,
      status: attendance.status,
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break attendance
  }

  return attendance;
}

export async function getDailyAttendance(
  businessId: string,
  dateInput?: string | Date
) {
  const dayRange = getDailyRange(dateInput);

  const [employees, attendances] = await Promise.all([
    prisma.employee.findMany({
      where: { businessId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        position: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.employeeAttendance.findMany({
      where: {
        businessId,
        date: { gte: dayRange.start, lte: dayRange.end },
      },
    }),
  ]);

  const attendanceMap = new Map(attendances.map((a) => [a.employeeId, a]));

  const records = employees.map((emp) => {
    const record = attendanceMap.get(emp.id);
    return {
      employee: emp,
      attendance: record || null,
    };
  });

  const presentCount = attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
  const leaveCount = attendances.filter((a) => a.status === 'LEAVE').length;
  const unrecordedCount = employees.length - attendances.length;

  return {
    date: dayRange.dateStr,
    records,
    summary: {
      totalEmployees: employees.length,
      presentCount,
      absentCount,
      leaveCount,
      unrecordedCount,
    },
  };
}

export async function getMonthlyAttendanceSummary(
  businessId: string,
  yearInput?: number,
  monthInput?: number
) {
  const monthRange = getMonthlyRange(yearInput, monthInput);

  const [employees, attendances] = await Promise.all([
    prisma.employee.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        position: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.employeeAttendance.findMany({
      where: {
        businessId,
        date: { gte: monthRange.start, lte: monthRange.end },
      },
    }),
  ]);

  const summary = employees.map((emp) => {
    const empAtt = attendances.filter((a) => a.employeeId === emp.id);
    const present = empAtt.filter((a) => a.status === 'PRESENT').length;
    const late = empAtt.filter((a) => a.status === 'LATE').length;
    const absent = empAtt.filter((a) => a.status === 'ABSENT').length;
    const leave = empAtt.filter((a) => a.status === 'LEAVE').length;
    const totalLogged = empAtt.length;
    const rate = totalLogged > 0 ? Math.round(((present + late) / totalLogged) * 100) : 100;

    return {
      employee: emp,
      present,
      late,
      absent,
      leave,
      totalLogged,
      attendanceRate: rate,
    };
  });

  return {
    year: monthRange.year,
    month: monthRange.month,
    daysInMonth: monthRange.daysInMonth,
    summary,
  };
}

// ----------------------------------------
// Step 30: Check-In / Check-Out & Late Marking
// ----------------------------------------

/**
 * Late-marking rule. Configurable per call; defaults suit a typical
 * Pakistani retail shop (9:00 AM start with a 15-minute grace period,
 * evaluated in server-local time consistent with date-utils).
 */
export const ATTENDANCE_LATE_RULE = {
  workStartHour: 9,
  workStartMinute: 0,
  graceMinutes: 15,
};

function isLateCheckIn(checkInTime: Date, rule = ATTENDANCE_LATE_RULE): boolean {
  const cutoff = new Date(checkInTime);
  cutoff.setHours(rule.workStartHour, rule.workStartMinute + rule.graceMinutes, 0, 0);
  return checkInTime > cutoff;
}

/**
 * Employee (or manager on behalf) checks in for the given day.
 * One attendance record per employee per day is enforced by the schema;
 * a second check-in on the same day is rejected.
 */
export async function checkInEmployee(
  businessId: string,
  employeeId: string,
  performedBy: string,
  options?: { date?: string | Date; checkInTime?: Date; branchId?: string | null }
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, businessId },
  });

  if (!employee) {
    throw new Error('Employee not found or unauthorized.');
  }

  const dayRange = getDailyRange(options?.date);
  const normalizedDate = dayRange.start;

  const existing = await prisma.employeeAttendance.findUnique({
    where: {
      businessId_employeeId_date: {
        businessId,
        employeeId,
        date: normalizedDate,
      },
    },
  });

  if (existing?.checkIn) {
    throw new Error('Already checked in for this day.');
  }

  if (existing && (existing.status === 'LEAVE' || existing.status === 'OFF_DAY')) {
    throw new Error(`Cannot check in - day is marked as ${existing.status}.`);
  }

  const checkInTime = options?.checkInTime ? new Date(options.checkInTime) : new Date();
  const late = isLateCheckIn(checkInTime);

  const attendance = await prisma.employeeAttendance.upsert({
    where: {
      businessId_employeeId_date: {
        businessId,
        employeeId,
        date: normalizedDate,
      },
    },
    update: {
      status: late ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      checkIn: checkInTime,
      recordedBy: performedBy,
    },
    create: {
      businessId,
      employeeId,
      branchId: options?.branchId || employee.branchId,
      date: normalizedDate,
      status: late ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      checkIn: checkInTime,
      recordedBy: performedBy,
    },
  });

  await recordAuditLog({
    businessId,
    userId: performedBy,
    branchId: attendance.branchId,
    action: 'EMPLOYEE_CHECKED_IN',
    entityType: 'EmployeeAttendance',
    entityId: attendance.id,
    metadata: {
      employeeId,
      employeeName: employee.name,
      date: dayRange.dateStr,
      markedLate: late,
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break attendance
  }

  return attendance;
}

/**
 * Employee (or manager on behalf) checks out. Requires an earlier check-in
 * and rejects duplicate check-outs.
 */
export async function checkOutEmployee(
  businessId: string,
  employeeId: string,
  performedBy: string,
  options?: { date?: string | Date; checkOutTime?: Date }
) {
  const dayRange = getDailyRange(options?.date);
  const normalizedDate = dayRange.start;

  const attendance = await prisma.employeeAttendance.findUnique({
    where: {
      businessId_employeeId_date: {
        businessId,
        employeeId,
        date: normalizedDate,
      },
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
  });

  if (!attendance || !attendance.checkIn) {
    throw new Error('No check-in found for this day.');
  }

  if (attendance.checkOut) {
    throw new Error('Already checked out for this day.');
  }

  const checkOutTime = options?.checkOutTime ? new Date(options.checkOutTime) : new Date();

  if (checkOutTime < attendance.checkIn) {
    throw new Error('Check-out time cannot be before check-in time.');
  }

  const updated = await prisma.employeeAttendance.update({
    where: { id: attendance.id },
    data: {
      checkOut: checkOutTime,
      recordedBy: performedBy,
    },
  });

  await recordAuditLog({
    businessId,
    userId: performedBy,
    branchId: updated.branchId,
    action: 'EMPLOYEE_CHECKED_OUT',
    entityType: 'EmployeeAttendance',
    entityId: updated.id,
    metadata: {
      employeeId,
      employeeName: attendance.employee.name,
      date: dayRange.dateStr,
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break attendance
  }

  return updated;
}
