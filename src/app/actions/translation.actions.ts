'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
import { MembershipRole } from '@/generated/prisma/client';
import {
  BILINGUAL_MODEL_FIELDS,
  resolveBilingualRegeneration,
  type BilingualModel,
} from '@/lib/translation/bilingual';
import { recordAuditLog } from '@/services/audit';
import { revalidatePath } from 'next/cache';

const allowedRoles = [MembershipRole.OWNER, MembershipRole.MANAGER];

type BilingualRecord = {
  name: string;
  description: string | null;
  nameEn: string | null;
  nameUr: string | null;
  descriptionEn: string | null;
  descriptionUr: string | null;
};

type BilingualUpdateData = Partial<Record<'nameEn' | 'nameUr' | 'descriptionEn' | 'descriptionUr', string | null>>;

const select = {
  name: true,
  description: true,
  nameEn: true,
  nameUr: true,
  descriptionEn: true,
  descriptionUr: true,
} as const;

/**
 * Retry generation of missing secondary-language translations for one record.
 * Tenant isolation: the record is always loaded scoped to the caller's
 * business membership (verified by requireBusinessAccess first).
 */
export async function regenerateTranslationsAction(
  model: BilingualModel,
  businessId: string,
  recordId: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId, allowedRoles);

    const fields = BILINGUAL_MODEL_FIELDS[model];

    let record: BilingualRecord | null = null;
    if (model === 'business') {
      record = await prisma.business.findUnique({ where: { id: businessId }, select });
    } else if (model === 'category') {
      record = await prisma.category.findFirst({ where: { id: recordId, businessId }, select });
    } else {
      record = await prisma.product.findFirst({ where: { id: recordId, businessId }, select });
    }

    if (!record) {
      return createError(AppErrors.NOT_FOUND, 'Record not found.');
    }

    const regenerated = await resolveBilingualRegeneration(record, [...fields]);
    const data = regenerated.data as BilingualUpdateData;

    if (Object.keys(data).length > 0) {
      if (model === 'business') {
        await prisma.business.update({ where: { id: businessId }, data });
      } else if (model === 'category') {
        await prisma.category.update({ where: { id: recordId, businessId }, data });
      } else {
        await prisma.product.update({ where: { id: recordId, businessId }, data });
      }
    }

    await recordAuditLog({
      businessId,
      userId: user.id,
      action: 'TRANSLATION_REGENERATED',
      entityType: model,
      entityId: model === 'business' ? businessId : recordId,
      metadata: { updatedFields: Object.keys(data), pendingFields: regenerated.failedFields },
    });

    revalidatePath('/dashboard/categories');
    revalidatePath('/dashboard/products');
    revalidatePath('/dashboard/settings');

    return createSuccess({
      updatedFields: Object.keys(data),
      pendingFields: regenerated.failedFields,
    });
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to regenerate translations');
  }
}
