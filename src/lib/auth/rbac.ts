import 'server-only';
import { MembershipRole } from '@/generated/prisma/client';
import { AppError, ErrorCodes } from '@/lib/errors';

/**
 * Shared RBAC guard for actions restricted to business OWNER/MANAGER roles.
 *
 * Callers remain responsible for resolving the role through the canonical
 * tenant context (`getActiveBusiness()` / `requireBusinessAccess()`) so
 * business/tenant isolation is enforced before this check runs.
 */
export function assertOwnerOrManager(
  role: MembershipRole,
  message = 'Only owners and managers can perform this action.'
): void {
  if (role !== MembershipRole.OWNER && role !== MembershipRole.MANAGER) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, message, 403);
  }
}
