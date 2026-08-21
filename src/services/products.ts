import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './audit';
import { AppErrors } from '@/lib/utils/api-response';

export async function createProduct(businessId: string, userId: string, data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  // Check if SKU exists
  if (data.sku) {
    const existing = await prisma.product.findUnique({
      where: { businessId_sku: { businessId, sku: data.sku } }
    });
    if (existing) throw new Error(AppErrors.DUPLICATE_RECORD);
  }

  const product = await prisma.product.create({
    data: {
      businessId,
      ...data,
      currentStock: 0, // Enforce starting stock to be 0, requiring explicit Opening Stock adjustment
    }
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'PRODUCT_CREATED',
    entityType: 'Product',
    entityId: product.id,
    metadata: { name: product.name, sku: product.sku }
  });

  return product;
}

export async function archiveProduct(businessId: string, userId: string, productId: string) {
  const product = await prisma.product.update({
    where: { id: productId, businessId },
    data: { isActive: false }
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'PRODUCT_ARCHIVED',
    entityType: 'Product',
    entityId: productId,
  });

  return product;
}

export async function updateProduct(businessId: string, userId: string, productId: string, data: any) {
  if (data.sku) {
    const existing = await prisma.product.findUnique({
      where: { businessId_sku: { businessId, sku: data.sku } }
    });
    if (existing && existing.id !== productId) throw new Error(AppErrors.DUPLICATE_RECORD);
  }

  const product = await prisma.product.update({
    where: { id: productId, businessId },
    data
  });

  await recordAuditLog({
    businessId, userId, action: 'PRODUCT_UPDATED', entityType: 'Product', entityId: productId,
  });

  return product;
}

