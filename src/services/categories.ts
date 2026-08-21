import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './audit';
import { AppErrors } from '@/lib/utils/api-response';

export async function createCategory(businessId: string, userId: string, data: any) {
  const existing = await prisma.category.findUnique({
    where: { businessId_name: { businessId, name: data.name } }
  });
  if (existing) throw new Error(AppErrors.DUPLICATE_RECORD);

  const category = await prisma.category.create({
    data: { businessId, ...data }
  });

  await recordAuditLog({
    businessId, userId, action: 'CATEGORY_CREATED', entityType: 'Category', entityId: category.id,
    metadata: { name: category.name }
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

  const category = await prisma.category.update({
    where: { id: categoryId, businessId },
    data
  });

  await recordAuditLog({
    businessId, userId, action: 'CATEGORY_UPDATED', entityType: 'Category', entityId: category.id,
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
