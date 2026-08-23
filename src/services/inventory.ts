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
  newStock: number,
  reason: string,
  branchId?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId, businessId },
    });

    if (!product) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Product not found', 404);
    }

    if (newStock < 0) {
      throw new AppError(ErrorCodes.INSUFFICIENT_STOCK, 'Insufficient stock', 409);
    }

    const previousStock = product.currentStock;
    const diff = newStock - previousStock;
    
    if (diff === 0) return product; // No change needed

    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        currentStock: newStock,
      },
    });

    const movementType = diff > 0 ? MovementType.ADJUSTMENT : MovementType.LOSS;

    await tx.stockMovement.create({
      data: {
        businessId,
        branchId,
        productId,
        movementType,
        quantity: diff,
        previousStock,
        resultingStock: newStock,
        notes: reason,
        createdBy: userId,
      }
    });

    logger.warn('Stock adjusted', { businessId, productId, previousStock, newStock, reason });

    await recordAuditLog({
      businessId,
      userId,
      branchId,
      action: 'STOCK_ADJUSTED',
      entityType: 'Product',
      entityId: productId,
      metadata: { previousStock, newStock, reason }
    });

    return updatedProduct;
  });

  try {
    invalidateAnalyticsCache({ businessId, branchId: branchId || undefined, module: 'inventory' });
    publishAnalyticsEvent({ type: 'stock', businessId, branchId: branchId || null, timestamp: Date.now() });
  } catch {
    // cache invalidation must never break the mutation
  }

  return result;
}
