'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { stockAdjustmentSchema } from '@/lib/validations';
import { adjustStock } from '@/services/inventory';
import { createError, createSuccess, AppErrors, type ErrorCode } from '@/lib/utils/api-response';
import { AppError, ErrorCodes } from '@/lib/errors';
import { MembershipRole } from '@/generated/prisma/client';
import { revalidatePath } from 'next/cache';

export async function adjustStockAction(businessId: string, formData: any) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER, MembershipRole.MANAGER
    ]);

    const validatedData = stockAdjustmentSchema.safeParse(formData);
    if (!validatedData.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid adjustment data', validatedData.error.flatten().fieldErrors);
    }

    const { productId, delta, reason } = validatedData.data;

    // Use branchId from membership if available, or null
    // Here we omit branchId for now to adjust overall business stock, per current schema behavior.
    const product = await adjustStock(businessId, user.id, productId, delta, reason, undefined);
    
    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/inventory/${productId}`);
    revalidatePath('/dashboard/products');
    
    return createSuccess(product);
  } catch (error: any) {
    if (error?.code === ErrorCodes.INSUFFICIENT_STOCK) {
      return createError(AppErrors.INSUFFICIENT_STOCK, 'Stock cannot go below zero.');
    }
    if (error instanceof AppError) {
      return createError(error.code as ErrorCode, error.message);
    }
    return createError(AppErrors.INTERNAL_ERROR, error?.message || 'Failed to adjust stock');
  }
}
