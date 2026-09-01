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

/**
 * Centralized page-level access rules.
 *
 * Each rule maps a dashboard route prefix to the capability from the existing
 * RolePermissionMatrix that is required to render it. Rules are matched by
 * longest prefix, so specific routes override the generic `/dashboard` rule.
 * This is the single source of truth used by BOTH the server-side page guards
 * and the navigation visibility filtering — no role logic is duplicated in
 * individual pages.
 */
export type PageAccessRule = {
  prefix: string;
  capability: PermissionCapability;
};

export const PageAccessRules: PageAccessRule[] = [
  // Overview dashboard renders financial KPI cards (revenue/profit/udhaar)
  { prefix: '/dashboard', capability: 'VIEW_FINANCIAL_REPORTS' },
  // Financial reports, growth analytics & expense module are financial data
  { prefix: '/dashboard/reports', capability: 'VIEW_FINANCIAL_REPORTS' },
  { prefix: '/dashboard/growth', capability: 'VIEW_FINANCIAL_REPORTS' },
  { prefix: '/dashboard/analytics', capability: 'VIEW_FINANCIAL_REPORTS' },
  { prefix: '/dashboard/expenses', capability: 'VIEW_FINANCIAL_REPORTS' },
  // Advisor findings are derived from profit/revenue/expense metrics
  { prefix: '/dashboard/advisor', capability: 'VIEW_PROFIT' },
  // Catalog management (incl. cost prices) and purchase documents
  { prefix: '/dashboard/products', capability: 'MANAGE_PRODUCTS' },
  { prefix: '/dashboard/categories', capability: 'MANAGE_PRODUCTS' },
  { prefix: '/dashboard/purchases', capability: 'VIEW_PURCHASES' },
  { prefix: '/dashboard/suppliers', capability: 'VIEW_PURCHASES' },
  // Customers/Udhaar supports credit-sale & payment workflows (CREATE_SALE roles)
  { prefix: '/dashboard/customers', capability: 'CREATE_SALE' },
  // POS checkout + offline sale sync require the ability to create sales
  { prefix: '/dashboard/pos', capability: 'CREATE_SALE' },
  { prefix: '/dashboard/sync', capability: 'CREATE_SALE' },
  { prefix: '/dashboard/inventory', capability: 'VIEW_INVENTORY' },
  { prefix: '/dashboard/sales', capability: 'VIEW_SALES' },
  // Staff management
  { prefix: '/dashboard/employees', capability: 'MANAGE_EMPLOYEES' },
];

function normalizePath(path: string): string {
  const withoutQuery = path.split('?')[0];
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * Returns true when the given role may render the dashboard path.
 * Unknown paths (no matching rule) remain accessible; platform-admin-only
 * routes are enforced separately on the server.
 */
export function canAccessDashboardPath(role: MembershipRole | string, path: string): boolean {
  const normalized = normalizePath(path);
  let matched: PageAccessRule | undefined;

  for (const rule of PageAccessRules) {
    const isMatch = normalized === rule.prefix || normalized.startsWith(`${rule.prefix}/`);
    if (isMatch && (!matched || rule.prefix.length > matched.prefix.length)) {
      matched = rule;
    }
  }

  if (!matched) return true;
  return hasPermission(role as MembershipRole, matched.capability);
}
