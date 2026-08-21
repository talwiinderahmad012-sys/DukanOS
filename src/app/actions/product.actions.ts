'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { productSchema } from '@/lib/validations';
import { createProduct, updateProduct, archiveProduct } from '@/services/products';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
import { MembershipRole } from '@/generated/prisma/client';

export async function createProductAction(businessId: string, formData: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  try {
    // 1. Authorize
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);

    // 2. Validate Input
    const validatedData = productSchema.safeParse(formData);
    if (!validatedData.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid product data', validatedData.error.flatten().fieldErrors);
    }

    // 3. Call Service
    const product = await createProduct(businessId, user.id, validatedData.data);
    
    // 4. Return Safe Output
    return createSuccess(product);
  } catch (error) {
    const err = error as Error;
    if (err.message === AppErrors.DUPLICATE_RECORD) {
      return createError(AppErrors.DUPLICATE_RECORD, 'A product with this SKU already exists in your business.');
    }
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create product');
  }
}

export async function updateProductAction(businessId: string, productId: string, formData: any) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER, MembershipRole.MANAGER
    ]);
    const validatedData = productSchema.safeParse(formData);
    if (!validatedData.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid product data', validatedData.error.flatten().fieldErrors);
    }
    const product = await updateProduct(businessId, user.id, productId, validatedData.data);
    return createSuccess(product);
  } catch (error) {
    const err = error as Error;
    if (err.message === AppErrors.DUPLICATE_RECORD) {
      return createError(AppErrors.DUPLICATE_RECORD, 'A product with this SKU already exists.');
    }
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update product');
  }
}

export async function archiveProductAction(businessId: string, productId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER, MembershipRole.MANAGER
    ]);
    const product = await archiveProduct(businessId, user.id, productId);
    return createSuccess(product);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to archive product');
  }
}

