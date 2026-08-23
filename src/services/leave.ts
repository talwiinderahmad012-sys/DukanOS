import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { LeaveStatus, LeaveType } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { createInAppNotification } from './notifications';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';

/** Leave types that consume a yearly balance. UNPAID leave never touches balances. */
const BALANCED_LEAVE_TYPES: LeaveType[] = [
  LeaveType.CASUAL,
  LeaveType.SICK,
  LeaveType.ANNUAL,
  LeaveType.OTHER,
];

/**
 * Default yearly allowances applied the first time a balance record is
 * created for an employee/type.
 */
export const DEFAULT_LEAVE_ALLOWANCES: Record<LeaveType, number> = {
  CASUAL: 12,
  SICK: 10,
  ANNUAL: 14,
  UNPAID: 0,
  OTHER: 0,
};

const MAX_REFLECTION_DAYS = 31;

function enumerateDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime() && days.length < MAX_REFLECTION_DAYS) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Applies the balance + attendance side effects of a leave decision inside a
 * transaction. Balance deduction happens ONLY on approval and is reversed
 * atomically when an approved leave is cancelled.
 */
async function applyLeaveDecision(
  tx: Prisma.TransactionClient,
  leave: {
    id: string;
    businessId: string;
    employeeId: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    daysCount: number;
  },
  decision: 'APPROVED' | 'REJECTED' | 'CANCELLED',
  wasApproved: boolean
) {
  const consumesBalance = BALANCED_LEAVE_TYPES.includes(leave.leaveType);
  const year = leave.startDate.getFullYear();

  // --- Balance handling -------------------------------------------------
  if (consumesBalance) {
    if (decision === 'APPROVED') {
      const balance = await tx.leaveBalance.findUnique({
        where: {
          businessId_employeeId_leaveType_year: {
            businessId: leave.businessId,
            employeeId: leave.employeeId,
            leaveType: leave.leaveType,
            year,
          },
        },
      });

      const totalAllowed = balance?.totalAllowed ?? DEFAULT_LEAVE_ALLOWANCES[leave.leaveType];
      const remaining = totalAllowed - (balance?.used ?? 0);

      if (remaining < leave.daysCount) {
        throw new Error(
          `Insufficient ${leave.leaveType.toLowerCase()} leave balance: ${Math.max(remaining, 0)} day(s) remaining, ${leave.daysCount} requested. Use UNPAID leave instead.`
        );
      }

      await tx.leaveBalance.upsert({
        where: {
          businessId_employeeId_leaveType_year: {
            businessId: leave.businessId,
            employeeId: leave.employeeId,
            leaveType: leave.leaveType,
            year,
          },
        },
        create: {
          businessId: leave.businessId,
          employeeId: leave.employeeId,
          leaveType: leave.leaveType,
          year,
          totalAllowed,
          used: leave.daysCount,
        },
        update: { used: { increment: leave.daysCount }, totalAllowed },
      });
    } else if (wasApproved) {
      // Reversal: approved leave being cancelled after the fact.
      await tx.leaveBalance.updateMany({
        where: {
          businessId: leave.businessId,
          employeeId: leave.employeeId,
          leaveType: leave.leaveType,
          year,
          used: { gte: leave.daysCount },
        },
        data: { used: { decrement: leave.daysCount } },
      });
    }
  }

  // --- Attendance reflection -------------------------------------------
  const dayStart = new Date(leave.startDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(leave.endDate);
  dayEnd.setHours(23, 59, 59, 999);

  if (decision === 'APPROVED') {
    const employee = await tx.employee.findUnique({
      where: { id: leave.employeeId },
      select: { branchId: true },
    });

    for (const day of enumerateDays(dayStart, dayEnd)) {
      const dayAtMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
      const existing = await tx.employeeAttendance.findFirst({
        where: {
          businessId: leave.businessId,
          employeeId: leave.employeeId,
          date: {
            gte: dayAtMidnight,
            lte: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999),
          },
        },
      });

      // Never overwrite a day that already has real punches recorded.
      if (!existing) {
        await tx.employeeAttendance.create({
          data: {
            businessId: leave.businessId,
            employeeId: leave.employeeId,
            branchId: employee?.branchId || null,
            date: dayAtMidnight,
            status: 'LEAVE',
            notes: `Approved ${leave.leaveType.toLowerCase()} leave`,
          },
        });
      }
    }
  } else if (wasApproved) {
    // Remove automatically-created LEAVE markers (only untouched ones).
    await tx.employeeAttendance.deleteMany({
      where: {
        businessId: leave.businessId,
        employeeId: leave.employeeId,
        status: 'LEAVE',
        checkIn: null,
        checkOut: null,
        notes: { contains: 'leave' },
        date: { gte: dayStart, lte: dayEnd },
      },
    });
  }
}

async function safeNotify(fn: () => Promise<unknown>) {
  // Notification failure must never break leave/payroll operations.
  try {
    await fn();
  } catch (error) {
    console.error('[leave] notification failed:', error);
  }
}

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

  // Whole-day leaves only - fractional days are not supported.
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const daysCount =
    data.daysCount && Number.isInteger(data.daysCount) && data.daysCount > 0
      ? data.daysCount
      : diffDays;

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

  // Notify Owner & Managers (best-effort)
  await safeNotify(() =>
    createInAppNotification({
      businessId,
      type: 'LEAVE_REQUEST',
      severity: 'INFO',
      title: `Leave Request: ${employee.name}`,
      message: `${employee.name} (${employee.employeeCode}) requested ${daysCount} day(s) of ${leave.leaveType.toLowerCase()} leave: "${leave.reason}".`,
      relatedEntity: 'EMPLOYEE',
      relatedEntityId: employee.id,
      deduplicationKey: `${businessId}-LEAVE-${leave.id}`,
    })
  );

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

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break leave mutation
  }

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

  // Self-approval is strictly forbidden.
  if (leave.employee.userId && leave.employee.userId === reviewerId) {
    throw new Error('You cannot approve or reject your own leave request.');
  }

  const wasApproved = leave.status === LeaveStatus.APPROVED;

  // State machine: PENDING -> APPROVED/REJECTED/CANCELLED; APPROVED -> CANCELLED only.
  if (leave.status !== LeaveStatus.PENDING) {
    if (!(leave.status === LeaveStatus.APPROVED && status === 'CANCELLED')) {
      throw new Error(`Leave request is already ${leave.status.toLowerCase()} and cannot be changed.`);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.employeeLeave.update({
      where: { id: leaveId },
      data: {
        status: status as LeaveStatus,
        approvedBy: reviewerId,
        approvalNotes: approvalNotes?.trim() || null,
        reviewedAt: new Date(),
      },
    });

    await applyLeaveDecision(
      tx,
      {
        id: leave.id,
        businessId: leave.businessId,
        employeeId: leave.employeeId,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        daysCount: leave.daysCount,
      },
      status as 'APPROVED' | 'REJECTED' | 'CANCELLED',
      wasApproved
    );

    return result;
  });

  // Notify the employee of the decision (best-effort, scoped to recipient)
  if (leave.employee.userId) {
    await safeNotify(() =>
      createInAppNotification({
        businessId,
        recipientId: leave.employee.userId!,
        type: 'SYSTEM',
        severity: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        title: `Leave Request ${status}`,
        message: `Your leave request for ${leave.daysCount} day(s) was ${status.toLowerCase()}.${approvalNotes ? ` Note: "${approvalNotes}"` : ''}`,
        relatedEntity: 'EMPLOYEE',
        relatedEntityId: leave.employee.id,
      })
    );
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
      previousStatus: leave.status,
      status,
      balanceReversed: wasApproved && status !== 'APPROVED',
      notes: approvalNotes || null,
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break leave mutation
  }

  return updated;
}

/**
 * Employee cancels their own leave request (while PENDING), or an
 * owner/manager cancels any active request. Cancelling an APPROVED leave
 * reverses the balance and removes attendance reflection atomically.
 */
export async function cancelLeaveRequest(
  businessId: string,
  cancelledBy: string,
  leaveId: string,
  options?: { reason?: string | null; isPrivileged?: boolean }
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

  const isSelf = !!leave.employee.userId && leave.employee.userId === cancelledBy;

  if (!isSelf && !options?.isPrivileged) {
    throw new Error('You can only cancel your own leave requests.');
  }

  if (isSelf && !options?.isPrivileged && leave.status !== LeaveStatus.PENDING) {
    throw new Error('Only pending leave requests can be cancelled by the applicant. Contact your manager.');
  }

  if (leave.status === LeaveStatus.REJECTED || leave.status === LeaveStatus.CANCELLED) {
    throw new Error(`Leave request is already ${leave.status.toLowerCase()}.`);
  }

  const wasApproved = leave.status === LeaveStatus.APPROVED;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.employeeLeave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.CANCELLED,
        approvalNotes: options?.reason?.trim() || leave.approvalNotes,
        reviewedAt: leave.reviewedAt ?? new Date(),
      },
    });

    await applyLeaveDecision(
      tx,
      {
        id: leave.id,
        businessId: leave.businessId,
        employeeId: leave.employeeId,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        daysCount: leave.daysCount,
      },
      'CANCELLED',
      wasApproved
    );

    return result;
  });

  await recordAuditLog({
    businessId,
    userId: cancelledBy,
    action: 'LEAVE_CANCELLED',
    entityType: 'EmployeeLeave',
    entityId: leave.id,
    metadata: {
      employeeId: leave.employee.id,
      employeeName: leave.employee.name,
      previousStatus: leave.status,
      cancelledBySelf: isSelf,
      balanceReversed: wasApproved,
      reason: options?.reason?.trim() || null,
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break leave mutation
  }

  return updated;
}

/**
 * Returns the yearly leave balance summary for an employee across all
 * balanced leave types. Allowances default to DEFAULT_LEAVE_ALLOWANCES until
 * an explicit balance row is created by an approval.
 */
export async function getEmployeeLeaveBalances(
  businessId: string,
  employeeId: string,
  year?: number
) {
  const targetYear = year ?? new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { businessId, employeeId, year: targetYear },
  });

  const byType = new Map(balances.map((b) => [b.leaveType, b]));

  return BALANCED_LEAVE_TYPES.map((type) => {
    const row = byType.get(type);
    const totalAllowed = row?.totalAllowed ?? DEFAULT_LEAVE_ALLOWANCES[type];
    const used = row?.used ?? 0;
    return {
      leaveType: type,
      year: targetYear,
      totalAllowed,
      used,
      remaining: Math.max(totalAllowed - used, 0),
    };
  });
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
