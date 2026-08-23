import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { PayrollStatus, SalaryPaymentStatus, PaymentMethod, LeaveStatus } from '@/generated/prisma/client';
import { Prisma } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';
import { AppError, ErrorCodes } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';


/** Notification failures must never break payroll operations. */
async function safeNotify(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.error('[payroll] notification failed:', error);
  }
}

/**
 * Finalized/paid payrolls are immutable. Any mutation attempt against them
 * must fail loudly instead of silently rewriting financial history.
 */
function assertPayrollMutable(status: PayrollStatus) {
  if (status === PayrollStatus.FINALIZED || status === PayrollStatus.PAID) {
    logger.warn('Immutable payroll mutation attempted', { status });
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      `Payroll is ${status.toLowerCase()} and is immutable. Historical salary records cannot be modified.`
    );
  }
}

export async function createPayrollPeriod(businessId: string, userId: string, data: { periodName: string; startDate: Date; endDate: Date }) {
  const existing = await prisma.payroll.findFirst({
    where: { businessId, periodName: data.periodName }
  });
  if (existing) throw new AppError(ErrorCodes.DUPLICATE_RECORD, 'Payroll period with this name already exists', 409);

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (end < start) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Payroll end date cannot be before start date', 400);

  const payroll = await prisma.payroll.create({
    data: {
      businessId,
      periodName: data.periodName,
      startDate: start,
      endDate: end,
      createdBy: userId,
      status: PayrollStatus.DRAFT
    }
  });

  await recordAuditLog({ businessId, userId, action: 'PAYROLL_CREATED', entityType: 'Payroll', entityId: payroll.id, metadata: { periodName: data.periodName } });
  return payroll;
}

export async function listPayrolls(businessId: string) {
  return prisma.payroll.findMany({
    where: { businessId },
    orderBy: { startDate: 'desc' },
    include: {
      _count: { select: { employeeSalary: true } },
    },
  });
}

export async function getPayrollDetail(businessId: string, payrollId: string) {
  return prisma.payroll.findFirst({
    where: { id: payrollId, businessId },
    include: {
      employeeSalary: {
        include: {
          employee: { select: { id: true, name: true, employeeCode: true, position: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/** Counts calendar days between two dates (inclusive). */
function countInclusiveDays(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

/** Overlap in whole days between an approved leave and the payroll period. */
function countOverlapDays(leaveStart: Date, leaveEnd: Date, periodStart: Date, periodEnd: Date): number {
  const s = leaveStart > periodStart ? leaveStart : periodStart;
  const e = leaveEnd < periodEnd ? leaveEnd : periodEnd;
  if (e < s) return 0;
  return countInclusiveDays(s, e);
}

export async function generateSalariesForPayroll(businessId: string, payrollId: string, userId: string) {
  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId, businessId } });
  if (!payroll) throw new AppError(ErrorCodes.NOT_FOUND, 'Payroll not found', 404);
  assertPayrollMutable(payroll.status);

  const employees = await prisma.employee.findMany({
    where: { businessId, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
    include: { user: { select: { id: true } } },
  });

  const periodStart = new Date(payroll.startDate);
  const periodEnd = new Date(payroll.endDate);
  const workingDays = countInclusiveDays(periodStart, periodEnd);

  // Approved UNPAID leaves overlapping the period drive salary deductions.
  const unpaidLeaves = await prisma.employeeLeave.findMany({
    where: {
      businessId,
      status: LeaveStatus.APPROVED,
      leaveType: 'UNPAID',
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
    },
  });

  let generated = 0;

  for (const emp of employees) {
    const existing = await prisma.employeeSalary.findFirst({
      where: { payrollId, employeeId: emp.id }
    });
    if (existing) continue;

    // --- Attendance impact --------------------------------------------
    const attendances = await prisma.employeeAttendance.findMany({
      where: {
        businessId,
        employeeId: emp.id,
        date: { gte: periodStart, lte: periodEnd },
      },
      select: { status: true },
    });

    const presentCount = attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const halfDayCount = attendances.filter((a) => a.status === 'HALF_DAY').length;
    const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
    const paidLeaveCount = attendances.filter((a) => a.status === 'LEAVE').length;

    const unpaidLeaveDays = unpaidLeaves
      .filter((l) => l.employeeId === emp.id)
      .reduce((sum, l) => sum + countOverlapDays(l.startDate, l.endDate, periodStart, periodEnd), 0);

    // --- Deterministic Decimal arithmetic (never Number() math) --------
    // netPay = baseSalary - authorizedSalaryImpact
    // authorizedSalaryImpact = (base / workingDays) * (absent + half*0.5 + unpaidLeave)
    const baseSalary = new Prisma.Decimal(emp.basicSalary);
    const dailyRate = baseSalary.dividedBy(new Prisma.Decimal(workingDays)).toDecimalPlaces(2);
    const nonWorkingUnits = new Prisma.Decimal(absentCount)
      .plus(new Prisma.Decimal(halfDayCount * 0.5))
      .plus(new Prisma.Decimal(unpaidLeaveDays));
    const authorizedDeduction = dailyRate.mul(nonWorkingUnits).toDecimalPlaces(2);

    let netSalary = baseSalary.minus(authorizedDeduction);
    if (netSalary.isNegative()) netSalary = new Prisma.Decimal(0);

    await prisma.employeeSalary.create({
      data: {
        businessId,
        employeeId: emp.id,
        payrollId,
        period: payroll.periodName,
        // Snapshot at generation time - later employee salary changes never
        // alter this record.
        baseSalary,
        overtime: new Prisma.Decimal(0),
        bonus: new Prisma.Decimal(0),
        deductions: authorizedDeduction,
        advance: new Prisma.Decimal(0),
        netSalary,
        paymentStatus: SalaryPaymentStatus.PENDING,
        workingDays,
        presentDays: presentCount + halfDayCount,
        absentDays: absentCount + unpaidLeaveDays,
        leaveDays: paidLeaveCount,
        recordedBy: userId,
      },
    });

    generated++;
  }

  logger.warn('Payroll salaries generated', { businessId, payrollId, generatedCount: generated, skippedExisting: employees.length - generated });

  await recordAuditLog({
    businessId,
    userId,
    action: 'PAYROLL_GENERATED_SALARIES',
    entityType: 'Payroll',
    entityId: payrollId,
    metadata: { generatedCount: generated, skippedExisting: employees.length - generated },
  });

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break payroll
  }

  return generated;
}

export async function finalizePayroll(businessId: string, payrollId: string, userId: string) {
  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId, businessId } });
  if (!payroll) throw new AppError(ErrorCodes.NOT_FOUND, 'Payroll not found', 404);

  if (payroll.status !== PayrollStatus.DRAFT) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `Only DRAFT payroll can be finalized (current status: ${payroll.status}).`, 400);
  }

  const salaryCount = await prisma.employeeSalary.count({ where: { payrollId } });
  if (salaryCount === 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot finalize an empty payroll. Generate salaries first.', 400);
  }

  const finalized = await prisma.payroll.update({
    where: { id: payrollId },
    data: { status: PayrollStatus.FINALIZED, finalizedBy: userId, finalizedAt: new Date() },
  });

  logger.warn('Payroll finalized', { businessId, payrollId, periodName: payroll.periodName, itemCount: salaryCount });

  await recordAuditLog({
    businessId,
    userId,
    action: 'PAYROLL_FINALIZED',
    entityType: 'Payroll',
    entityId: payroll.id,
    metadata: { periodName: payroll.periodName, itemCount: salaryCount },
  });

  await notifyEmployeesAboutPayroll(businessId, payroll.periodName, payrollId, 'FINALIZED');

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break payroll
  }

  return finalized;
}

/**
 * Marks a FINALIZED payroll as PAID and settles all pending salary records
 * in a single transaction. DRAFT payrolls must be finalized first.
 */
export async function markPayrollPaid(
  businessId: string,
  payrollId: string,
  userId: string,
  paymentMethod: PaymentMethod = PaymentMethod.CASH
) {
  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId, businessId } });
  if (!payroll) throw new AppError(ErrorCodes.NOT_FOUND, 'Payroll not found', 404);

  if (payroll.status === PayrollStatus.PAID) {
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Payroll is already marked as paid.');
  }
  if (payroll.status !== PayrollStatus.FINALIZED) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `Only FINALIZED payroll can be marked paid (current status: ${payroll.status}).`, 400);
  }

  const now = new Date();

  const paid = await prisma.$transaction(async (tx) => {
    const result = await tx.payroll.update({
      where: { id: payrollId },
      data: { status: PayrollStatus.PAID },
    });

    await tx.employeeSalary.updateMany({
      where: { payrollId, paymentStatus: SalaryPaymentStatus.PENDING },
      data: {
        paymentStatus: SalaryPaymentStatus.PAID,
        paymentDate: now,
        paymentMethod,
        recordedBy: userId,
      },
    });

    return result;
  });

  logger.warn('Payroll marked as paid', { businessId, payrollId, periodName: payroll.periodName, paymentMethod });

  await recordAuditLog({
    businessId,
    userId,
    action: 'PAYROLL_PAID',
    entityType: 'Payroll',
    entityId: payroll.id,
    metadata: { periodName: payroll.periodName, paymentMethod },
  });

  await notifyEmployeesAboutPayroll(businessId, payroll.periodName, payrollId, 'PAID', paymentMethod);

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break payroll
  }

  return paid;
}

/** Best-effort employee notifications for payroll lifecycle events. */
async function notifyEmployeesAboutPayroll(
  businessId: string,
  periodName: string,
  payrollId: string,
  event: 'FINALIZED' | 'PAID',
  paymentMethod?: PaymentMethod
) {
  try {
    const items = await prisma.employeeSalary.findMany({
      where: { payrollId },
      include: { employee: { select: { userId: true, id: true } } },
    });

    for (const item of items) {
      if (!item.employee.userId) continue;

      const title = event === 'FINALIZED' ? 'Payroll Finalized' : 'Salary Paid';
      const message =
        event === 'FINALIZED'
          ? `Your salary for "${periodName}" has been finalized.`
          : `Your salary for "${periodName}" has been paid via ${paymentMethod}.`;

      await safeNotify(() =>
        prisma.notification.create({
          data: {
            businessId,
            recipientId: item.employee.userId!,
            type: 'SYSTEM',
            severity: event === 'PAID' ? 'SUCCESS' : 'INFO',
            title,
            message,
            relatedEntity: 'EMPLOYEE',
            relatedEntityId: item.employee.id,
          },
        })
      );
    }
  } catch (error) {
    console.error('[payroll] employee notification failed:', error);
  }
}

/**
 * Cancels a payroll. Cancellation is controlled and audited - existing salary
 * history is never deleted. PAID payrolls cannot be cancelled.
 */
export async function cancelPayroll(
  businessId: string,
  payrollId: string,
  userId: string,
  reason?: string | null
) {
  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId, businessId } });
  if (!payroll) throw new AppError(ErrorCodes.NOT_FOUND, 'Payroll not found', 404);

  if (payroll.status === PayrollStatus.PAID) {
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'PAID payroll cannot be cancelled. Use a reversal/adjustment instead.');
  }
  if (payroll.status === PayrollStatus.CANCELLED) {
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Payroll is already cancelled.');
  }

  const cancelled = await prisma.payroll.update({
    where: { id: payrollId },
    data: { status: PayrollStatus.CANCELLED },
  });

  logger.warn('Payroll cancelled', { businessId, payrollId, periodName: payroll.periodName, previousStatus: payroll.status, reason: reason?.trim() || null });

  await recordAuditLog({
    businessId,
    userId,
    action: 'PAYROLL_CANCELLED',
    entityType: 'Payroll',
    entityId: payroll.id,
    metadata: {
      periodName: payroll.periodName,
      previousStatus: payroll.status,
      reason: reason?.trim() || null,
    },
  });

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break payroll
  }

  return cancelled;
}

export async function recordSalaryPayment(businessId: string, salaryId: string, userId: string, data: { amount: number; paymentMethod: PaymentMethod; notes?: string }) {
  const salary = await prisma.employeeSalary.findFirst({
    where: { id: salaryId, businessId },
    include: { payroll: { select: { status: true } } },
  });
  if (!salary) throw new AppError(ErrorCodes.NOT_FOUND, 'Salary record not found', 404);
  if (salary.paymentStatus === SalaryPaymentStatus.PAID) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Salary already fully paid');
  if (salary.payroll && !['DRAFT', 'FINALIZED'].includes(salary.payroll.status)) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `Cannot record payment against a ${salary.payroll.status.toLowerCase()} payroll.`, 400);
  }

  const payment = await prisma.employeeSalary.update({
    where: { id: salaryId },
    data: {
      paymentStatus: SalaryPaymentStatus.PAID,
      paymentDate: new Date(),
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      recordedBy: userId
    }
  });

  await recordAuditLog({ businessId, userId, action: 'SALARY_PAID', entityType: 'EmployeeSalary', entityId: salaryId, metadata: { method: data.paymentMethod } });

  try {
    invalidateAnalyticsCache({ businessId, module: 'payroll' });
    publishAnalyticsEvent({ type: 'payroll', businessId, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break payroll
  }

  return payment;
}

