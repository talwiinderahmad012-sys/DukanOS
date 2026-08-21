import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { EmployeeStatus, SalaryType } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { getDailyRange } from '@/lib/utils/date-utils';

export async function generateNextEmployeeCode(businessId: string): Promise<string> {
  const count = await prisma.employee.count({
    where: { businessId },
  });
  
  let candidateNumber = count + 1;
  let code = `EMP-${String(candidateNumber).padStart(3, '0')}`;

  // Check if exists, loop until unique
  let exists = await prisma.employee.findUnique({
    where: {
      businessId_employeeCode: {
        businessId,
        employeeCode: code,
      },
    },
  });

  while (exists) {
    candidateNumber++;
    code = `EMP-${String(candidateNumber).padStart(3, '0')}`;
    exists = await prisma.employee.findUnique({
      where: {
        businessId_employeeCode: {
          businessId,
          employeeCode: code,
        },
      },
    });
  }

  return code;
}

export async function createEmployee(
  businessId: string,
  userId: string,
  data: {
    name: string;
    employeeCode?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    position: string;
    department?: string | null;
    joiningDate?: Date | string;
    branchId?: string | null;
    salaryType?: SalaryType;
    basicSalary?: number;
    status?: EmployeeStatus;
    notes?: string | null;
  }
) {
  const code = data.employeeCode?.trim() || (await generateNextEmployeeCode(businessId));

  // Check code uniqueness
  const existing = await prisma.employee.findUnique({
    where: {
      businessId_employeeCode: {
        businessId,
        employeeCode: code,
      },
    },
  });

  if (existing) {
    throw new Error(`Employee code "${code}" is already assigned to another staff member in this business.`);
  }

  const employee = await prisma.employee.create({
    data: {
      businessId,
      branchId: data.branchId || null,
      employeeCode: code,
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      position: data.position.trim(),
      department: data.department?.trim() || null,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
      salaryType: data.salaryType || SalaryType.MONTHLY,
      basicSalary: data.basicSalary !== undefined ? data.basicSalary : 0,
      status: data.status || EmployeeStatus.ACTIVE,
      notes: data.notes?.trim() || null,
    },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'EMPLOYEE_CREATED',
    entityType: 'Employee',
    entityId: employee.id,
    metadata: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      position: employee.position,
      basicSalary: Number(employee.basicSalary),
    },
  });

  return employee;
}

export async function updateEmployee(
  businessId: string,
  userId: string,
  employeeId: string,
  data: Partial<{
    name: string;
    employeeCode: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    position: string;
    department: string | null;
    joiningDate: Date | string;
    branchId: string | null;
    salaryType: SalaryType;
    basicSalary: number;
    status: EmployeeStatus;
    notes: string | null;
  }>
) {
  const existing = await prisma.employee.findFirst({
    where: { id: employeeId, businessId },
  });

  if (!existing) {
    throw new Error('Employee not found or unauthorized.');
  }

  // If code changed, check uniqueness
  if (data.employeeCode && data.employeeCode !== existing.employeeCode) {
    const codeConflict = await prisma.employee.findUnique({
      where: {
        businessId_employeeCode: {
          businessId,
          employeeCode: data.employeeCode,
        },
      },
    });
    if (codeConflict) {
      throw new Error(`Employee code "${data.employeeCode}" is already in use.`);
    }
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.employeeCode && { employeeCode: data.employeeCode.trim() }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
      ...(data.address !== undefined && { address: data.address?.trim() || null }),
      ...(data.position && { position: data.position.trim() }),
      ...(data.department !== undefined && { department: data.department?.trim() || null }),
      ...(data.joiningDate && { joiningDate: new Date(data.joiningDate) }),
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.salaryType && { salaryType: data.salaryType }),
      ...(data.basicSalary !== undefined && { basicSalary: data.basicSalary }),
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
    },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'Employee',
    entityId: employeeId,
    metadata: {
      employeeCode: updated.employeeCode,
      name: updated.name,
      status: updated.status,
    },
  });

  return updated;
}

export async function archiveEmployee(businessId: string, userId: string, employeeId: string) {
  const existing = await prisma.employee.findFirst({
    where: { id: employeeId, businessId },
  });

  if (!existing) {
    throw new Error('Employee not found or unauthorized.');
  }

  const archived = await prisma.employee.update({
    where: { id: employeeId },
    data: { status: EmployeeStatus.INACTIVE },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'EMPLOYEE_ARCHIVED',
    entityType: 'Employee',
    entityId: employeeId,
    metadata: { name: archived.name, employeeCode: archived.employeeCode },
  });

  return archived;
}

export async function getEmployeeById(businessId: string, employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, businessId },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, name: true, email: true } },
      attendances: {
        orderBy: { date: 'desc' },
        take: 30,
      },
      leaves: {
        orderBy: { createdAt: 'desc' },
        take: 15,
      },
      salaries: {
        orderBy: { period: 'desc' },
        take: 12,
      },
      complaints: {
        orderBy: { createdAt: 'desc' },
        take: 15,
      },
    },
  });

  if (!employee) {
    throw new Error('Employee not found.');
  }

  // Factual Attendance Summary
  const totalAttendances = employee.attendances.length;
  const presentCount = employee.attendances.filter((a) => a.status === 'PRESENT').length;
  const lateCount = employee.attendances.filter((a) => a.status === 'LATE').length;
  const absentCount = employee.attendances.filter((a) => a.status === 'ABSENT').length;
  const leaveCount = employee.attendances.filter((a) => a.status === 'LEAVE').length;
  const attendanceRate = totalAttendances > 0 ? Math.round(((presentCount + lateCount) / totalAttendances) * 100) : 100;

  return {
    employee,
    stats: {
      totalLoggedDays: totalAttendances,
      presentCount,
      lateCount,
      absentCount,
      leaveCount,
      attendanceRate,
      approvedLeavesCount: employee.leaves.filter((l) => l.status === 'APPROVED').length,
      pendingComplaintsCount: employee.complaints.filter((c) => c.status === 'OPEN' || c.status === 'IN_REVIEW').length,
    },
  };
}

export async function listEmployees(
  businessId: string,
  options: {
    search?: string;
    branchId?: string;
    position?: string;
    status?: EmployeeStatus | 'ALL';
    page?: number;
    limit?: number;
  } = {}
) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { businessId };

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options.branchId) {
    where.branchId = options.branchId;
  }

  if (options.position) {
    where.position = { contains: options.position, mode: 'insensitive' };
  }

  if (options.search) {
    const term = options.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { employeeCode: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
      { position: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Fetch today's date range for live attendance status
  const today = getDailyRange();

  const [employees, totalCount, todayAttendances] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.employee.count({ where }),
    prisma.employeeAttendance.findMany({
      where: {
        businessId,
        date: { gte: today.start, lte: today.end },
      },
      select: {
        employeeId: true,
        status: true,
        checkIn: true,
        checkOut: true,
      },
    }),
  ]);

  const attendanceMap = new Map(todayAttendances.map((a) => [a.employeeId, a]));

  const enrichedEmployees = employees.map((emp) => {
    const todayAtt = attendanceMap.get(emp.id);
    return {
      ...emp,
      todayAttendance: todayAtt || null,
    };
  });

  return {
    employees: enrichedEmployees,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

export async function getEmployeeDashboardStats(businessId: string) {
  const today = getDailyRange();

  const [
    totalEmployees,
    activeEmployees,
    todayAttendances,
    pendingLeaves,
    openComplaints,
  ] = await Promise.all([
    prisma.employee.count({ where: { businessId } }),
    prisma.employee.count({ where: { businessId, status: EmployeeStatus.ACTIVE } }),
    prisma.employeeAttendance.findMany({
      where: {
        businessId,
        date: { gte: today.start, lte: today.end },
      },
      select: { status: true },
    }),
    prisma.employeeLeave.count({
      where: { businessId, status: 'PENDING' },
    }),
    prisma.employeeComplaint.count({
      where: { businessId, status: { in: ['OPEN', 'IN_REVIEW'] } },
    }),
  ]);

  const presentToday = todayAttendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentToday = todayAttendances.filter((a) => a.status === 'ABSENT').length;
  const onLeaveToday = todayAttendances.filter((a) => a.status === 'LEAVE').length;

  return {
    totalEmployees,
    activeEmployees,
    presentToday,
    absentToday,
    onLeaveToday,
    pendingLeaves,
    openComplaints,
  };
}
