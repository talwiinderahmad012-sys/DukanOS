const fs = require('fs');
const path = require('path');
const file = path.join('d:\\\\DukanOS', 'src/app/actions/settings.actions.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '} from \'@/services/settings/business-settings\';',
  '  deactivateBranch,\n  reactivateBranch,\n  updateInvoiceDisplaySettings,\n} from \'@/services/settings/business-settings\';'
);

content = content.replace(
  'updateBusinessProfile(businessId, user.id, payload)',
  'updateBusinessProfile(businessId, payload as any)'
);
content = content.replace(
  'updateSalesSettings(businessId, user.id, payload)',
  'updateSalesSettings(businessId, payload as any)'
);
content = content.replace(
  'updateAdvisorSettings(businessId, user.id, payload)',
  'updateAdvisorSettings(businessId, payload as any)'
);
content = content.replace(
  'updateReceiptSettings(businessId, user.id, payload)',
  'updateReceiptSettings(businessId, payload as any)'
);
content = content.replace(
  'updateInventorySettings(businessId, user.id, payload)',
  'updateInventorySettings(businessId, payload as any)'
);
content = content.replace(
  'createBranch(businessId, user.id, payload)',
  'createBranch(businessId, payload as any)'
);
content = content.replace(
  'updateBranch(businessId, user.id, payload.branchId, payload)',
  'updateBranch(businessId, payload.branchId, payload as any)'
);

content += `
export async function deactivateBranchAction(businessId: string, branchId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await deactivateBranch(businessId, branchId);
    return createSuccess(result);
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message || 'Failed to deactivate branch');
  }
}

export async function reactivateBranchAction(businessId: string, branchId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const result = await reactivateBranch(businessId, branchId);
    return createSuccess(result);
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message || 'Failed to reactivate branch');
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
  } catch (error: any) {
    return createError(AppErrors.INTERNAL_ERROR, error.message || 'Failed to update invoice display settings');
  }
}
`;

fs.writeFileSync(file, content);
