import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { MovementType } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { AppErrors } from '@/lib/utils/api-response';

export async function adjustStock(
  businessId: string,
  userId: string,
  productId: string,
  newStock: number,
  reason: string,
  branchId?: string
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId, businessId },
    });

    if (!product) {
      throw new Error(AppErrors.NOT_FOUND);
    }

    if (newStock < 0) {
      throw new Error(AppErrors.INSUFFICIENT_STOCK);
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
}
