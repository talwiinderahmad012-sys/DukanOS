import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { MovementType } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { AppError, ErrorCodes } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent } from '@/lib/cache/analytics-events';

export async function adjustStock(
  businessId: string,
  userId: string,
  productId: string,
  delta: number,
  reason: string,
  branchId?: string
) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Stock adjustment must be a non-zero whole number of units.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId, businessId },
    });

    if (!product) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Product not found', 404);
    }

    // Delta is applied atomically against the server-side authoritative stock
    // with a non-negativity guard. The client never sends a baseline stock
    // value, so concurrent purchases/sales/adjustments cannot lose updates.
    const updated: Array<{ currentStock: number }> = await tx.$queryRaw`
      UPDATE "public"."Product"
      SET "currentStock" = "currentStock" + ${delta}::integer,
          "updatedAt" = NOW()
      WHERE "id" = ${productId}::text
        AND "businessId" = ${businessId}::text
        AND ("currentStock" + ${delta}::integer) >= 0
      RETURNING "currentStock";
    `;

    if (!updated || updated.length === 0) {
      logger.warn('Stock adjustment rejected: would make stock negative', { businessId, productId, delta, reason });
      throw new AppError(ErrorCodes.INSUFFICIENT_STOCK, 'Insufficient stock', 409);
    }

    const resultingStock = Number(updated[0].currentStock);
    const previousStock = resultingStock - delta;

    let movementType: MovementType = MovementType.ADJUSTMENT;
    if (reason === 'Damage') movementType = MovementType.DAMAGE;
    else if (reason === 'Loss') movementType = MovementType.LOSS;
    else if (reason === 'Opening Stock') movementType = MovementType.OPENING;

    await tx.stockMovement.create({
      data: {
        businessId,
        branchId,
        productId,
        movementType,
        quantity: delta,
        previousStock,
        resultingStock,
        notes: reason,
        createdBy: userId,
      }
    });

    logger.warn('Stock adjusted', { businessId, productId, previousStock, resultingStock, delta, reason });

    await recordAuditLog({
      businessId,
      userId,
      branchId,
      action: 'STOCK_ADJUSTED',
      entityType: 'Product',
      entityId: productId,
      metadata: { previousStock, newStock: resultingStock, delta, reason }
    });

    return await tx.product.findUnique({
      where: { id: productId },
    });
  });

  try {
    invalidateAnalyticsCache({ businessId, branchId: branchId || undefined, module: 'inventory' });
    publishAnalyticsEvent({ type: 'stock', businessId, branchId: branchId || null, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the mutation
  }

  return result;
}
