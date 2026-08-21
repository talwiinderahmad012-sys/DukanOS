'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  createEmployee,
  updateEmployee,
  archiveEmployee,
  getEmployeeById,
  listEmployees,
} from '@/services/employees';
import { recordAttendance, getDailyAttendance } from '@/services/attendance';
import { createLeaveRequest, reviewLeaveRequest, listEmployeeLeaves } from '@/services/leave';
import { createSalaryRecord, recordSalaryPayment } from '@/services/salaries';
import { createComplaint, resolveComplaint, listComplaints } from '@/services/complaints';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  recordAttendanceSchema,
  createLeaveRequestSchema,
  reviewLeaveSchema,
  createSalaryRecordSchema,
  recordSalaryPaymentSchema,
  createComplaintSchema,
  resolveComplaintSchema,
  employeeFilterSchema,
} from '@/lib/validations';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

// ----------------------------------------
// Employee Profile Actions
// ----------------------------------------
export async function createEmployeeAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = createEmployeeSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid employee input data',
        validated.error.flatten().fieldErrors
      );
    }

    const employee = await createEmployee(businessId, user.id, validated.data as any);
    return createSuccess(employee);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create employee');
  }
}

export async function updateEmployeeAction(
  businessId: string,
  employeeId: string,
  rawData: unknown
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = updateEmployeeSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid employee update data',
        validated.error.flatten().fieldErrors
      );
    }

    const updated = await updateEmployee(businessId, user.id, employeeId, validated.data as any);
    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update employee');
  }
}

export async function archiveEmployeeAction(businessId: string, employeeId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const archived = await archiveEmployee(businessId, user.id, employeeId);
    return createSuccess(archived);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to archive employee');
  }
}

export async function getEmployeeAction(businessId: string, employeeId: string) {
  try {
    await requireBusinessAccess(businessId);
    const data = await getEmployeeById(businessId, employeeId);
    return createSuccess(data);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch employee');
  }
}

export async function listEmployeesAction(businessId: string, rawParams?: unknown) {
  try {
    await requireBusinessAccess(businessId);
    const validated = employeeFilterSchema.safeParse(rawParams || {});
    const params = validated.success ? validated.data : {};
    const result = await listEmployees(businessId, params as any);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list employees');
  }
}

// ----------------------------------------
// Attendance Actions
// ----------------------------------------
export async function recordAttendanceAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const validated = recordAttendanceSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid attendance data',
        validated.error.flatten().fieldErrors
      );
    }

    const attendance = await recordAttendance(businessId, user.id, validated.data as any);
    return createSuccess(attendance);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to record attendance');
  }
}

export async function getDailyAttendanceAction(businessId: string, date?: string) {
  try {
    await requireBusinessAccess(businessId);
    const data = await getDailyAttendance(businessId, date);
    return createSuccess(data);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch daily attendance');
  }
}

// ----------------------------------------
// Leave Actions
// ----------------------------------------
export async function createLeaveRequestAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const validated = createLeaveRequestSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid leave request data',
        validated.error.flatten().fieldErrors
      );
    }

    const leave = await createLeaveRequest(businessId, user.id, validated.data as any);
    return createSuccess(leave);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to request leave');
  }
}

export async function reviewLeaveAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = reviewLeaveSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid leave review data',
        validated.error.flatten().fieldErrors
      );
    }

    const updated = await reviewLeaveRequest(
      businessId,
      user.id,
      validated.data.leaveId,
      validated.data.status,
      validated.data.approvalNotes
    );
    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to review leave request');
  }
}

// ----------------------------------------
// Salary Actions
// ----------------------------------------
export async function createSalaryRecordAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = createSalaryRecordSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid salary input data',
        validated.error.flatten().fieldErrors
      );
    }

    const salary = await createSalaryRecord(businessId, user.id, validated.data);
    return createSuccess(salary);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to generate salary record');
  }
}

export async function recordSalaryPaymentAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = recordSalaryPaymentSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid payment data',
        validated.error.flatten().fieldErrors
      );
    }

    const salary = await recordSalaryPayment(
      businessId,
      user.id,
      validated.data.salaryId,
      validated.data.paymentMethod,
      validated.data.notes
    );
    return createSuccess(salary);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to record salary payment');
  }
}

// ----------------------------------------
// Complaint Actions
// ----------------------------------------
export async function createComplaintAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const validated = createComplaintSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid complaint data',
        validated.error.flatten().fieldErrors
      );
    }

    const complaint = await createComplaint(businessId, user.id, validated.data as any);
    return createSuccess(complaint);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to submit complaint');
  }
}

export async function resolveComplaintAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = resolveComplaintSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid resolution data',
        validated.error.flatten().fieldErrors
      );
    }

    const resolved = await resolveComplaint(
      businessId,
      user.id,
      validated.data.complaintId,
      validated.data.status,
      validated.data.resolutionNote
    );
    return createSuccess(resolved);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to resolve complaint');
  }
}
