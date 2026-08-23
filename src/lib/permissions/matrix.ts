import 'server-only';
import { MembershipRole } from '@/generated/prisma/client';

export type PermissionCapability =
  | 'MANAGE_BUSINESS_PROFILE'
  | 'MANAGE_BRANCHES'
  | 'VIEW_MEMBERS'
  | 'MANAGE_MEMBERS'
  | 'EXPORT_DATA'
  | 'ARCHIVE_BUSINESS'
  | 'TRANSFER_OWNERSHIP'
  | 'CONFIGURE_POS_RULES'
  | 'CONFIGURE_ADVISOR'
  | 'CONFIGURE_COMMUNICATIONS'
  | 'VIEW_SALES'
  | 'CREATE_SALE'
  | 'VOID_SALE'
  | 'VIEW_PURCHASES'
  | 'CREATE_PURCHASE'
  | 'VIEW_PROFIT'
  | 'VIEW_FINANCIAL_REPORTS'
  | 'MANAGE_EMPLOYEES'
  | 'VIEW_SALARIES'
  | 'MANAGE_SALARIES'
  | 'MANAGE_CAMERAS'
  | 'VIEW_CAMERAS'
  | 'MANAGE_PRODUCTS'
  | 'MANAGE_INVENTORY'
  | 'VIEW_INVENTORY';

export const RolePermissionMatrix: Record<MembershipRole, PermissionCapability[]> = {
  OWNER: [
    'MANAGE_BUSINESS_PROFILE',
    'MANAGE_BRANCHES',
    'VIEW_MEMBERS',
    'MANAGE_MEMBERS',
    'EXPORT_DATA',
    'ARCHIVE_BUSINESS',
    'TRANSFER_OWNERSHIP',
    'CONFIGURE_POS_RULES',
    'CONFIGURE_ADVISOR',
    'CONFIGURE_COMMUNICATIONS',
    'VIEW_SALES',
    'CREATE_SALE',
    'VOID_SALE',
    'VIEW_PURCHASES',
    'CREATE_PURCHASE',
    'VIEW_PROFIT',
    'VIEW_FINANCIAL_REPORTS',
    'MANAGE_EMPLOYEES',
    'VIEW_SALARIES',
    'MANAGE_SALARIES',
    'MANAGE_CAMERAS',
    'VIEW_CAMERAS',
    'MANAGE_PRODUCTS',
    'MANAGE_INVENTORY',
    'VIEW_INVENTORY',
  ],
  MANAGER: [
    'MANAGE_BRANCHES',
    'VIEW_MEMBERS',
    'VIEW_SALES',
    'CREATE_SALE',
    'VOID_SALE',
    'VIEW_PURCHASES',
    'CREATE_PURCHASE',
    'VIEW_PROFIT',
    'VIEW_FINANCIAL_REPORTS',
    'MANAGE_EMPLOYEES',
    'MANAGE_CAMERAS',
    'VIEW_CAMERAS',
    'MANAGE_PRODUCTS',
    'MANAGE_INVENTORY',
    'VIEW_INVENTORY',
  ],
  CASHIER: [
    'VIEW_SALES',
    'CREATE_SALE',
    'VIEW_INVENTORY',
    'VIEW_CAMERAS',
  ],
  EMPLOYEE: [
    'VIEW_SALES',
    'VIEW_INVENTORY',
    'VIEW_CAMERAS',
  ],
};

export function hasPermission(role: MembershipRole, capability: PermissionCapability): boolean {
  const permissions = RolePermissionMatrix[role] || [];
  return permissions.includes(capability);
}

export function assertPermission(role: MembershipRole, capability: PermissionCapability): void {
  if (!hasPermission(role, capability)) {
    throw new Error(`Forbidden: Role '${role}' lacks permission for '${capability}'.`);
  }
}
