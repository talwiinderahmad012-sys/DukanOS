import 'server-only';
import { prisma } from '@/lib/db/prisma';

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
