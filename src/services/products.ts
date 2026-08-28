import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './audit';
import { AppErrors } from '@/lib/utils/api-response';
import {
  BILINGUAL_MODEL_FIELDS,
  resolveBilingualCreate,
  resolveBilingualUpdate,
} from '@/lib/translation/bilingual';

const BILINGUAL_FIELDS = BILINGUAL_MODEL_FIELDS.product;

export async function createProduct(businessId: string, userId: string, data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  // Check if SKU exists
  if (data.sku) {
    const existing = await prisma.product.findUnique({
      where: { businessId_sku: { businessId, sku: data.sku } }
    });
    if (existing) throw new Error(AppErrors.DUPLICATE_RECORD);
  }

  const bilingual = await resolveBilingualCreate(data, BILINGUAL_FIELDS);

  const product = await prisma.product.create({
    data: {
      businessId,
      ...data,
      ...bilingual.data,
      currentStock: 0, // Enforce starting stock to be 0, requiring explicit Opening Stock adjustment
    }
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'PRODUCT_CREATED',
    entityType: 'Product',
    entityId: product.id,
    metadata: { name: product.name, sku: product.sku, translationPending: bilingual.failedFields }
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

  const current = await prisma.product.findUnique({
    where: { id: productId, businessId },
    select: { name: true, description: true, nameEn: true, nameUr: true, descriptionEn: true, descriptionUr: true }
  });
  if (!current) throw new Error(AppErrors.NOT_FOUND);

  const bilingual = await resolveBilingualUpdate(current, data, BILINGUAL_FIELDS);

  const product = await prisma.product.update({
    where: { id: productId, businessId },
    data: { ...data, ...bilingual.data }
  });

  await recordAuditLog({
    businessId, userId, action: 'PRODUCT_UPDATED', entityType: 'Product', entityId: productId,
    metadata: { translationPending: bilingual.failedFields }
  });

  return product;
}

