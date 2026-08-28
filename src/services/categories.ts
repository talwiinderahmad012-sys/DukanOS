import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './audit';
import { AppErrors } from '@/lib/utils/api-response';
import {
  BILINGUAL_MODEL_FIELDS,
  resolveBilingualCreate,
  resolveBilingualUpdate,
} from '@/lib/translation/bilingual';

const BILINGUAL_FIELDS = BILINGUAL_MODEL_FIELDS.category;

export async function createCategory(businessId: string, userId: string, data: any) {
  const existing = await prisma.category.findUnique({
    where: { businessId_name: { businessId, name: data.name } }
  });
  if (existing) throw new Error(AppErrors.DUPLICATE_RECORD);

  const bilingual = await resolveBilingualCreate(data, BILINGUAL_FIELDS);

  const category = await prisma.category.create({
    data: { businessId, ...data, ...bilingual.data }
  });

  await recordAuditLog({
    businessId, userId, action: 'CATEGORY_CREATED', entityType: 'Category', entityId: category.id,
    metadata: { name: category.name, translationPending: bilingual.failedFields }
  });

  return category;
}

export async function updateCategory(businessId: string, userId: string, categoryId: string, data: any) {
  if (data.name) {
    const existing = await prisma.category.findUnique({
      where: { businessId_name: { businessId, name: data.name } }
    });
    if (existing && existing.id !== categoryId) throw new Error(AppErrors.DUPLICATE_RECORD);
  }

  const current = await prisma.category.findUnique({
    where: { id: categoryId, businessId },
    select: { name: true, description: true, nameEn: true, nameUr: true, descriptionEn: true, descriptionUr: true }
  });
  if (!current) throw new Error(AppErrors.NOT_FOUND);

  const bilingual = await resolveBilingualUpdate(current, data, BILINGUAL_FIELDS);

  const category = await prisma.category.update({
    where: { id: categoryId, businessId },
    data: { ...data, ...bilingual.data }
  });

  await recordAuditLog({
    businessId, userId, action: 'CATEGORY_UPDATED', entityType: 'Category', entityId: category.id,
    metadata: { translationPending: bilingual.failedFields }
  });

  return category;
}

export async function archiveCategory(businessId: string, userId: string, categoryId: string) {
  const category = await prisma.category.update({
    where: { id: categoryId, businessId },
    data: { isActive: false }
  });

  await recordAuditLog({
    businessId, userId, action: 'CATEGORY_ARCHIVED', entityType: 'Category', entityId: category.id,
  });

  return category;
}
