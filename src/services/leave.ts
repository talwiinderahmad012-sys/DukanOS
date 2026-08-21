import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { LeaveStatus, LeaveType, NotificationSeverity } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';

export async function createLeaveRequest(
  businessId: string,
  submittedBy: string,
  data: {
    employeeId: string;
    leaveType: LeaveType;
    startDate: Date | string;
    endDate: Date | string;
    daysCount?: number;
    reason: string;
  }
) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, businessId },
  });

  if (!employee) {
    throw new Error('Employee not found or unauthorized.');
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (end < start) {
    throw new Error('End date cannot be earlier than start date.');
  }

  // Calculate default days count if not provided
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const daysCount = data.daysCount && data.daysCount > 0 ? data.daysCount : diffDays;

  const leave = await prisma.employeeLeave.create({
    data: {
      businessId,
      employeeId: data.employeeId,
      leaveType: data.leaveType || LeaveType.CASUAL,
      startDate: start,
      endDate: end,
      daysCount,
      reason: data.reason.trim(),
      status: LeaveStatus.PENDING,
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
    },
  });

  // Notify Owner & Managers
  await prisma.notification.create({
    data: {
      businessId,
      type: 'LEAVE_REQUEST',
      severity: NotificationSeverity.INFO,
      title: `Leave Request: ${employee.name}`,
      message: `${employee.name} (${employee.employeeCode}) requested ${daysCount} day(s) of ${leave.leaveType.toLowerCase()} leave: "${leave.reason}".`,
      isOwnerOnly: false,
      relatedEntity: 'EMPLOYEE',
      relatedEntityId: employee.id,
      deduplicationKey: `${businessId}-LEAVE-${leave.id}`,
    },
  });

  await recordAuditLog({
    businessId,
    userId: submittedBy,
    action: 'LEAVE_REQUESTED',
    entityType: 'EmployeeLeave',
    entityId: leave.id,
    metadata: {
      employeeId: employee.id,
      employeeName: employee.name,
      daysCount,
      leaveType: leave.leaveType,
    },
  });

  return leave;
}

export async function reviewLeaveRequest(
  businessId: string,
  reviewerId: string,
  leaveId: string,
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
  approvalNotes?: string | null
) {
  const leave = await prisma.employeeLeave.findFirst({
    where: { id: leaveId, businessId },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, userId: true } },
    },
  });

  if (!leave) {
    throw new Error('Leave request not found or unauthorized.');
  }

  const updated = await prisma.employeeLeave.update({
    where: { id: leaveId },
    data: {
      status: status as LeaveStatus,
      approvedBy: reviewerId,
      approvalNotes: approvalNotes?.trim() || null,
    },
  });

  // If employee has a linked user account, notify them of decision
  if (leave.employee.userId) {
    await prisma.notification.create({
      data: {
        businessId,
        recipientId: leave.employee.userId,
        type: 'LEAVE_DECISION',
        severity: status === 'APPROVED' ? NotificationSeverity.INFO : NotificationSeverity.WARNING,
        title: `Leave Request ${status}`,
        message: `Your leave request for ${leave.daysCount} day(s) was ${status.toLowerCase()}.${approvalNotes ? ` Note: "${approvalNotes}"` : ''}`,
        isOwnerOnly: false,
        relatedEntity: 'EMPLOYEE',
        relatedEntityId: leave.employee.id,
      },
    });
  }

  await recordAuditLog({
    businessId,
    userId: reviewerId,
    action: `LEAVE_${status}`,
    entityType: 'EmployeeLeave',
    entityId: leave.id,
    metadata: {
      employeeId: leave.employee.id,
      employeeName: leave.employee.name,
      status,
      notes: approvalNotes || null,
    },
  });

  return updated;
}

export async function listEmployeeLeaves(
  businessId: string,
  options: {
    employeeId?: string;
    status?: LeaveStatus | 'ALL';
    page?: number;
    limit?: number;
  } = {}
) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { businessId };

  if (options.employeeId) {
    where.employeeId = options.employeeId;
  }

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  const [leaves, totalCount] = await Promise.all([
    prisma.employeeLeave.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, position: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.employeeLeave.count({ where }),
  ]);

  return {
    leaves,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}
