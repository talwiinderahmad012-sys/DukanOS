'use server';

import { requireBusinessAccess, requireAuthenticatedUser } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  getOrCreateBusinessSettings,
  updateBusinessProfile,
  updateSalesSettings,
  updateAdvisorSettings,
  updateReceiptSettings,
  updateInventorySettings,
  listBranches,
  createBranch,
  updateBranch,
  deactivateBranch,
  reactivateBranch,
  updateInvoiceDisplaySettings,
} from '@/services/settings/business-settings';
import {
  listBusinessMembers,
  updateMemberRole,
  removeMember,
  attachUserToBusiness,
} from '@/services/settings/members';
import {
  changeUserPassword,
  updateUserProfile,
} from '@/services/settings/security';
import { recordAuthAudit } from '@/services/audit';
import { exportBusinessData } from '@/services/settings/export';
import { getSystemDiagnostics } from '@/services/settings/system-health';
import { createError, createSuccess, AppErrors, actionError } from '@/lib/utils/api-response';

// ----------------------------------------
// Business Settings Actions
// ----------------------------------------

export async function getBusinessSettingsAction(businessId: string) {
  try {
    await requireBusinessAccess(businessId);
    const data = await getOrCreateBusinessSettings(businessId);
    return createSuccess(data);
  } catch (error) {
    return actionError(error, 'Failed to get business settings');
  }
}

export async function updateBusinessProfileAction(
  businessId: string,
  payload: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    timezone?: string;
    currency?: string;
    currencySymbol?: string;
    currencyPosition?: string;
    logoUrl?: string | null;
    operatingHours?: string | null;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await updateBusinessProfile(businessId, payload as any);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to update business profile');
  }
}

export async function updateSalesSettingsAction(
  businessId: string,
  payload: {
    invoicePrefix?: string;
    invoiceStartingNumber?: number;
    allowNegativeStock?: boolean;
    requireCustomerForCredit?: boolean;
    maxCashierDiscountPercent?: number;
    maxManagerDiscountPercent?: number;
    requireSaleCancellationReason?: boolean;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await updateSalesSettings(businessId, payload as any);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to update sales settings');
  }
}

export async function updateAdvisorSettingsAction(
  businessId: string,
  payload: {
    salesDeclineThresholdPercent?: number;
    profitDeclineThresholdPercent?: number;
    expenseSpikeThresholdPercent?: number;
    creditRiskThresholdPercent?: number;
    slowMovingDays?: number;
    advisorRuleLowStock?: boolean;
    advisorRuleSlowMoving?: boolean;
    advisorRuleSalesDecline?: boolean;
    advisorRuleProfitDecline?: boolean;
    advisorRuleCreditRisk?: boolean;
    advisorRuleExpenseSpike?: boolean;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await updateAdvisorSettings(businessId, payload as any);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to update advisor settings');
  }
}

export async function updateReceiptSettingsAction(
  businessId: string,
  payload: {
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    showFeedbackQr?: boolean;
    showTaxNumber?: boolean;
    taxNumber?: string | null;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await updateReceiptSettings(businessId, payload as any);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to update receipt settings');
  }
}

export async function updateInventorySettingsAction(
  businessId: string,
  payload: any
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await updateInventorySettings(businessId, payload);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to update inventory settings');
  }
}

// ----------------------------------------
// Member & Role Management Actions
// ----------------------------------------

export async function listMembersAction(businessId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);
    const members = await listBusinessMembers(businessId);
    return createSuccess(members);
  } catch (error) {
    return actionError(error, 'Failed to list members');
  }
}

export async function updateMemberRoleAction(
  businessId: string,
  payload: {
    targetUserId: string;
    newRole: MembershipRole;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await updateMemberRole(businessId, user.id, payload.targetUserId, payload.newRole);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to update member role');
  }
}

export async function removeMemberAction(businessId: string, targetUserId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await removeMember(businessId, user.id, targetUserId);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to remove member');
  }
}

export async function attachMemberAction(
  businessId: string,
  payload: {
    email: string;
    role: MembershipRole;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await attachUserToBusiness(businessId, user.id, payload.email, payload.role);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to attach member');
  }
}

// ----------------------------------------
// User Profile & Security Actions
// ----------------------------------------

export async function updateUserProfileAction(payload: {
  name?: string;
  phone?: string | null;
}) {
  try {
    const user = await requireAuthenticatedUser();
    const updated = await updateUserProfile(user.id, payload);
    return createSuccess(updated);
  } catch (error) {
    return actionError(error, 'Failed to update profile');
  }
}

export async function changePasswordAction(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const user = await requireAuthenticatedUser();
    const result = await changeUserPassword(user.id, payload.currentPassword, payload.newPassword);

    await recordAuthAudit({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      metadata: { email: user.email },
    })

    // Note: The JWT callback re-validates passHash on every token refresh.
    // Session invalidation is handled automatically when the password hash no longer matches.

    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to change password');
  }
}

// ----------------------------------------
// Data Export & System Diagnostics
// ----------------------------------------

export async function exportDataAction(
  businessId: string,
  payload: {
    format?: 'JSON' | 'CSV';
    modules?: string[];
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await exportBusinessData(businessId, user.id, payload);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to export data');
  }
}

export async function getSystemDiagnosticsAction(businessId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);
    const diagnostics = await getSystemDiagnostics(businessId);
    return createSuccess(diagnostics);
  } catch (error) {
    return actionError(error, 'Failed to get system diagnostics');
  }
}

// ----------------------------------------
// Branch Management Actions
// ----------------------------------------

export async function listBranchesAction(businessId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);
    const branches = await listBranches(businessId);
    return createSuccess(branches);
  } catch (error) {
    return actionError(error, 'Failed to list branches');
  }
}

export async function createBranchAction(
  businessId: string,
  payload: {
    name: string;
    code: string;
    address?: string | null;
    phone?: string | null;
    city?: string | null;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const branch = await createBranch(businessId, payload as any);
    return createSuccess(branch);
  } catch (error) {
    return actionError(error, 'Failed to create branch');
  }
}

export async function updateBranchAction(
  businessId: string,
  payload: {
    branchId: string;
    name?: string;
    address?: string | null;
    phone?: string | null;
    city?: string | null;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const branch = await updateBranch(businessId, payload.branchId, payload as any);
    return createSuccess(branch);
  } catch (error) {
    return actionError(error, 'Failed to update branch');
  }
}


export async function deactivateBranchAction(businessId: string, branchId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await deactivateBranch(businessId, branchId);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to deactivate branch');
  }
}

export async function reactivateBranchAction(businessId: string, branchId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await reactivateBranch(businessId, branchId);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to reactivate branch');
  }
}

export async function updateInvoiceDisplaySettingsAction(
  businessId: string,
  payload: any
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await updateInvoiceDisplaySettings(businessId, payload);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to update invoice display settings');
  }
}
