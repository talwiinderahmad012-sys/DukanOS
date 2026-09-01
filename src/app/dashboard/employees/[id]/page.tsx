import { requireActiveBusiness } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { getEmployeeById, getMyEmployeeProfile } from '@/services/employees';
import { getEmployeeLeaveBalances } from '@/services/leave';
import { notFound, redirect } from 'next/navigation';
import {
  EmployeeDetailClient,
  type SerializedEmployeeData,
  type SerializedAuditLog,
  type SerializedLeaveBalance,
} from './employee-detail-client';

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, user, membership } = await requireActiveBusiness();
  const { id } = await params;

  const myProfile = await getMyEmployeeProfile(business.id, user.id);
  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';
  if (!isOwnerOrManager && myProfile?.id !== id) {
    redirect('/dashboard/me');
  }

  const [employeeData, auditLogs, branches] = await Promise.all([
    getEmployeeById(business.id, id).catch(() => null),
    prisma.auditLog.findMany({
      where: {
        businessId: business.id,
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true },
    }),
  ]);

  if (!employeeData) {
    notFound();
  }

  const leaveBalances = isOwnerOrManager
    ? await getEmployeeLeaveBalances(business.id, id)
    : [];

  const employee = employeeData.employee;

  const serializedEmployeeData: SerializedEmployeeData = {
    employee: {
      id: employee.id,
      name: employee.name,
      employeeCode: employee.employeeCode,
      phone: employee.phone,
      email: employee.email,
      address: employee.address,
      position: employee.position,
      department: employee.department,
      joiningDate: employee.joiningDate.toISOString(),
      status: employee.status,
      salaryType: employee.salaryType,
      basicSalary: Number(employee.basicSalary),
      notes: employee.notes,
      branch: employee.branch ? { id: employee.branch.id, name: employee.branch.name } : null,
      attendances: employee.attendances.map((a) => ({
        id: a.id,
        date: a.date.toISOString(),
        status: a.status,
        checkIn: a.checkIn ? a.checkIn.toISOString() : null,
        checkOut: a.checkOut ? a.checkOut.toISOString() : null,
        notes: a.notes,
      })),
      leaves: employee.leaves.map((l) => ({
        id: l.id,
        leaveType: l.leaveType,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        daysCount: l.daysCount,
        reason: l.reason,
        approvalNotes: l.approvalNotes,
        status: l.status,
      })),
      salaries: employee.salaries.map((s) => ({
        id: s.id,
        period: s.period,
        baseSalary: Number(s.baseSalary),
        overtime: Number(s.overtime),
        bonus: Number(s.bonus),
        deductions: Number(s.deductions),
        advance: Number(s.advance),
        netSalary: Number(s.netSalary),
        paymentStatus: s.paymentStatus,
      })),
      complaints: employee.complaints.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        priority: c.priority,
        status: c.status,
        description: c.description,
        resolutionNote: c.resolutionNote,
        createdAt: c.createdAt.toISOString(),
      })),
    },
    stats: {
      totalLoggedDays: employeeData.stats.totalLoggedDays,
      presentCount: employeeData.stats.presentCount,
      lateCount: employeeData.stats.lateCount,
      absentCount: employeeData.stats.absentCount,
      leaveCount: employeeData.stats.leaveCount,
      attendanceRate: employeeData.stats.attendanceRate,
      approvedLeavesCount: employeeData.stats.approvedLeavesCount,
      pendingComplaintsCount: employeeData.stats.pendingComplaintsCount,
    },
  };

  const serializedAuditLogs: SerializedAuditLog[] = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  }));

  const serializedLeaveBalances: SerializedLeaveBalance[] = leaveBalances.map((b) => ({
    leaveType: b.leaveType,
    year: b.year,
    totalAllowed: b.totalAllowed,
    used: b.used,
    remaining: b.remaining,
  }));

  return (
    <EmployeeDetailClient
      businessId={business.id}
      employeeData={serializedEmployeeData}
      auditLogs={serializedAuditLogs}
      branches={branches}
      isOwnerOrManager={isOwnerOrManager}
      leaveBalances={serializedLeaveBalances}
      currentYear={new Date().getFullYear()}
    />
  );
}
