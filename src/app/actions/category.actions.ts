'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { categorySchema } from '@/lib/validations';
import { createCategory, updateCategory, archiveCategory } from '@/services/categories';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
import { MembershipRole } from '@/generated/prisma/client';
import { revalidatePath } from 'next/cache';

const allowedRoles = [MembershipRole.OWNER, MembershipRole.MANAGER];

export async function createCategoryAction(businessId: string, formData: any) {
  try {
    const { user } = await requireBusinessAccess(businessId, allowedRoles);
    const validatedData = categorySchema.safeParse(formData);
    if (!validatedData.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid category data', validatedData.error.flatten().fieldErrors);
    }
    const category = await createCategory(businessId, user.id, validatedData.data);
    revalidatePath('/dashboard/categories');
    return createSuccess(category);
  } catch (error) {
    const err = error as Error;
    if (err.message === AppErrors.DUPLICATE_RECORD) {
      return createError(AppErrors.DUPLICATE_RECORD, 'A category with this name already exists.');
    }
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create category');
  }
}

export async function updateCategoryAction(businessId: string, categoryId: string, formData: any) {
  try {
    const { user } = await requireBusinessAccess(businessId, allowedRoles);
    const validatedData = categorySchema.safeParse(formData);
    if (!validatedData.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid category data', validatedData.error.flatten().fieldErrors);
    }
    const category = await updateCategory(businessId, user.id, categoryId, validatedData.data);
    revalidatePath('/dashboard/categories');
    return createSuccess(category);
  } catch (error) {
    const err = error as Error;
    if (err.message === AppErrors.DUPLICATE_RECORD) {
      return createError(AppErrors.DUPLICATE_RECORD, 'A category with this name already exists.');
    }
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update category');
  }
}

export async function archiveCategoryAction(businessId: string, categoryId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, allowedRoles);
    const category = await archiveCategory(businessId, user.id, categoryId);
    revalidatePath('/dashboard/categories');
    return createSuccess(category);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to archive category');
  }
}
