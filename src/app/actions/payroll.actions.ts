'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole, PaymentMethod } from '@/generated/prisma/client';
import {
  createPayrollPeriod,
  generateSalariesForPayroll,
  finalizePayroll,
  recordSalaryPayment,
  markPayrollPaid,
  cancelPayroll,
} from '@/services/payroll';
import { payrollPeriodSchema, payrollActionSchema } from '@/lib/validations';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

export async function createPayrollPeriodAction(businessId: string, rawData: unknown) {
  try {
    const session = await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);

    const validated = payrollPeriodSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid payroll period data', validated.error.flatten().fieldErrors);
    }

    const res = await createPayrollPeriod(businessId, session.user.id, {
      periodName: validated.data.periodName,
      startDate: new Date(validated.data.startDate),
      endDate: new Date(validated.data.endDate)
    });
    return createSuccess(res);
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message);
  }
}

export async function generateSalariesAction(businessId: string, payrollId: string) {
  try {
    const session = await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);
    const res = await generateSalariesForPayroll(businessId, payrollId, session.user.id);
    return createSuccess(res);
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message);
  }
}

export async function finalizePayrollAction(businessId: string, payrollId: string) {
  try {
    const session = await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);
    const res = await finalizePayroll(businessId, payrollId, session.user.id);
    return createSuccess(res);
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message);
  }
}

/** FINALIZED -> PAID. Settles all pending salary records transactionally. */
export async function markPayrollPaidAction(businessId: string, rawData: unknown) {
  try {
    const session = await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);

    const validated = payrollActionSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid payroll payment data', validated.error.flatten().fieldErrors);
    }

    const res = await markPayrollPaid(
      businessId,
      validated.data.payrollId,
      session.user.id,
      validated.data.paymentMethod ?? PaymentMethod.CASH
    );
    return createSuccess(res);
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message);
  }
}

/** Controlled cancellation - DRAFT/FINALIZED only, audited, history preserved. */
export async function cancelPayrollAction(businessId: string, rawData: unknown) {
  try {
    const session = await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);

    const validated = payrollActionSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid payroll cancellation data', validated.error.flatten().fieldErrors);
    }

    const res = await cancelPayroll(businessId, validated.data.payrollId, session.user.id, validated.data.reason ?? null);
    return createSuccess(res);
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message);
  }
}

export async function recordSalaryPaymentAction(businessId: string, salaryId: string, data: { amount: number; paymentMethod: string; notes?: string }) {
  try {
    const session = await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);
    const res = await recordSalaryPayment(businessId, salaryId, session.user.id, {
      amount: data.amount,
      paymentMethod: data.paymentMethod as PaymentMethod,
      notes: data.notes
    });
    return createSuccess(res);
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message);
  }
}
