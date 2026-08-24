import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logging';

type RecordAuditParams = {
  businessId: string;
  userId?: string | null;
  branchId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  ipAddress?: string;
};

export async function recordAuditLog(params: RecordAuditParams) {
  return prisma.auditLog.create({
    data: {
      businessId: params.businessId,
      userId: params.userId,
      branchId: params.branchId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress,
    }
  });
}

/**
 * Deterministic tenant-attribution rule for authentication audit events.
 *
 * AuditLog rows are tenant-scoped (required businessId FK) and auth events are
 * user-level, so attribution follows this documented rule:
 *
 * 1. If the caller provides `businessId` (verified session/business context,
 *    e.g. logout from an active dashboard session), the event is attached to
 *    that business — but only if the user actually holds a membership there.
 * 2. Otherwise the event is attached to the user's PRIMARY membership,
 *    defined deterministically as the earliest-created membership with ties
 *    broken by ascending id. The selection is stable across queries and
 *    identical for every user/business combination.
 * 3. Users with no membership (registration, intruder attempts) have no valid
 *    tenant scope; the event is written to the secure structured server log so
 *    it is never silently lost.
 *
 * Never throws: audit must not break auth flows.
 */
export async function recordAuthAudit(params: {
  userId: string | null;
  action: string;
  metadata?: unknown;
  ipAddress?: string;
  /** Explicit tenant context override; must be a business the user belongs to. */
  businessId?: string | null;
}) {
  try {
    const membership = params.userId
      ? await prisma.businessMembership.findFirst({
          where: {
            userId: params.userId,
            ...(params.businessId ? { businessId: params.businessId } : {}),
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { businessId: true },
        })
      : null;

    if (!membership) {
      logger.warn('Authentication security event (no tenant scope, logged only)', {
        category: 'AUTH',
        action: params.action,
        userId: params.userId ?? undefined,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
      });
      return null;
    }

    return await recordAuditLog({
      businessId: membership.businessId,
      userId: params.userId,
      action: params.action,
      entityType: 'Auth',
      entityId: params.userId || 'unknown',
      metadata: params.metadata,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    logger.error('Failed to persist auth audit event', {
      category: 'AUTH',
      action: params.action,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return null;
  }
}
