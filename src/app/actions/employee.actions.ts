'use server';

import { requireBusinessAccess, requireAuthenticatedUser } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  createEmployee,
  updateEmployee,
  archiveEmployee,
  getEmployeeById,
  listEmployees,
  getMyEmployeeProfile,
  updateSalaryStructure,
  deactivateEmployee,
  assignBranch,
} from '@/services/employees';
import {
  recordAttendance,
  getDailyAttendance,
  checkInEmployee,
  checkOutEmployee,
} from '@/services/attendance';
import {
  createLeaveRequest,
  reviewLeaveRequest,
  listEmployeeLeaves,
  cancelLeaveRequest,
  getEmployeeLeaveBalances,
} from '@/services/leave';
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
  employeeCheckInSchema,
  cancelLeaveSchema,
  updateSalaryStructureSchema,
  assignBranchSchema,
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
    await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);
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

// ----------------------------------------
// Step 30: Check-In / Check-Out Actions
// ----------------------------------------

/** Resolves the employee profile linked to the current user. */
async function requireMyEmployeeProfile(businessId: string) {
  const user = await requireAuthenticatedUser();
  const profile = await getMyEmployeeProfile(businessId, user.id);
  if (!profile) {
    throw new Error('No employee profile is linked to your account.');
  }
  return { user, profile };
}

/** True when the caller is OWNER or MANAGER of the business. */
async function isPrivilegedMember(businessId: string): Promise<boolean> {
  const { membership } = await requireBusinessAccess(businessId);
  return membership.role === MembershipRole.OWNER || membership.role === MembershipRole.MANAGER;
}

/**
 * Self-service check-in for the logged-in employee. Managers/owners may
 * check in on behalf of an employee by passing employeeId.
 */
export async function checkInAction(businessId: string, rawData?: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const validated = employeeCheckInSchema.safeParse(rawData || {});

    if (validated.success && validated.data.employeeId) {
      // On-behalf check-in requires elevated role.
      if (!(await isPrivilegedMember(businessId))) {
        return createError(AppErrors.UNAUTHORIZED, 'Not allowed to check in other employees');
      }
      const attendance = await checkInEmployee(
        businessId,
        validated.data.employeeId,
        user.id,
        { date: validated.data.date }
      );
      return createSuccess(attendance);
    }

    const date = validated.success ? validated.data.date : undefined;
    const { profile } = await requireMyEmployeeProfile(businessId);
    const attendance = await checkInEmployee(businessId, profile.id, user.id, { date });
    return createSuccess(attendance);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to check in');
  }
}

/** Self-service check-out; mirrors check-in authorization rules. */
export async function checkOutAction(businessId: string, rawData?: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const validated = employeeCheckInSchema.safeParse(rawData || {});

    if (validated.success && validated.data.employeeId) {
      if (!(await isPrivilegedMember(businessId))) {
        return createError(AppErrors.UNAUTHORIZED, 'Not allowed to check out other employees');
      }
      const attendance = await checkOutEmployee(
        businessId,
        validated.data.employeeId,
        user.id,
        { date: validated.data.date }
      );
      return createSuccess(attendance);
    }

    const date = validated.success ? validated.data.date : undefined;
    const { profile } = await requireMyEmployeeProfile(businessId);
    const attendance = await checkOutEmployee(businessId, profile.id, user.id, { date });
    return createSuccess(attendance);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to check out');
  }
}

// ----------------------------------------
// Step 30: Leave Self-Service & Balances
// ----------------------------------------

/** Employee cancels their own pending leave; managers/owners can cancel any. */
// DEFERRED (P3-17): This action is currently dead code and not wired to the UI.
export async function cancelLeaveAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const validated = cancelLeaveSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid cancellation data', validated.error.flatten().fieldErrors);
    }

    const cancelled = await cancelLeaveRequest(businessId, user.id, validated.data.leaveId, {
      reason: validated.data.reason,
      isPrivileged: await isPrivilegedMember(businessId),
    });
    return createSuccess(cancelled);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to cancel leave request');
  }
}

/** Leave balances for the caller or a specific employee (elevated roles). */
// DEFERRED (P3-17): This action is currently dead code and not wired to the UI.
export async function getLeaveBalancesAction(businessId: string, employeeId?: string) {
  try {
    await requireBusinessAccess(businessId);

    if (employeeId) {
      if (!(await isPrivilegedMember(businessId))) {
        return createError(AppErrors.UNAUTHORIZED, 'Not allowed to view other employees\' balances');
      }
      const balances = await getEmployeeLeaveBalances(businessId, employeeId);
      return createSuccess(balances);
    }

    const { profile } = await requireMyEmployeeProfile(businessId);
    const balances = await getEmployeeLeaveBalances(businessId, profile.id);
    return createSuccess(balances);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch leave balances');
  }
}

// ----------------------------------------
// Step 30: Salary Structure / Branch / Deactivation
// ----------------------------------------

// DEFERRED (P3-17): This action is currently dead code and not wired to the UI.
export async function updateSalaryStructureAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = updateSalaryStructureSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid salary structure data', validated.error.flatten().fieldErrors);
    }

    const updated = await updateSalaryStructure(businessId, user.id, validated.data as any);
    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update salary structure');
  }
}

// DEFERRED (P3-17): This action is currently dead code and not wired to the UI.
export async function assignBranchAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = assignBranchSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid branch assignment data', validated.error.flatten().fieldErrors);
    }

    const updated = await assignBranch(businessId, user.id, validated.data.employeeId, validated.data.branchId);
    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to assign branch');
  }
}

// DEFERRED (P3-17): This action is currently dead code and not wired to the UI.
export async function deactivateEmployeeAction(businessId: string, rawData: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const parsed = (rawData || {}) as { employeeId?: string; status?: string; reason?: string };
    if (!parsed.employeeId) {
      return createError(AppErrors.VALIDATION_ERROR, 'employeeId is required');
    }
    const status = parsed.status === 'INACTIVE' ? ('INACTIVE' as const) : ('LEFT' as const);

    const deactivated = await deactivateEmployee(
      businessId,
      user.id,
      parsed.employeeId,
      status,
      parsed.reason || null
    );
    return createSuccess(deactivated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to deactivate employee');
  }
}
