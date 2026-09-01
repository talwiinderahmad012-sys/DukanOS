import 'server-only';
import { MembershipRole } from '@/generated/prisma/client';
import { hasPermission, type PermissionCapability } from './permissions-core';

// The capability list, role matrix, hasPermission() and the centralized
// page-access rules live in permissions-core so they can also be used by
// client components (navigation visibility). This module stays server-only
// and additionally provides throwing guards.
export * from './permissions-core';
