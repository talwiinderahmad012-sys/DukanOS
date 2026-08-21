import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { AttendanceStatus } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { getDailyRange, getMonthlyRange } from '@/lib/utils/date-utils';

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
    action: 'ATTENDANCE_RECORDED',
    entityType: 'EmployeeAttendance',
    entityId: attendance.id,
    metadata: {
      employeeId: employee.id,
      employeeName: employee.name,
      date: dayRange.dateStr,
      status: attendance.status,
    },
  });

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
