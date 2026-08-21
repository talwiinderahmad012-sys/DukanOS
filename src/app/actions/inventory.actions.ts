'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { stockAdjustmentSchema } from '@/lib/validations';
import { adjustStock } from '@/services/inventory';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
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

    const { productId, newStock, reason } = validatedData.data;

    // Use branchId from membership if available, or null
    // Here we omit branchId for now to adjust overall business stock, per current schema behavior.
    const product = await adjustStock(businessId, user.id, productId, newStock, reason, undefined);
    
    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/inventory/${productId}`);
    revalidatePath('/dashboard/products');
    
    return createSuccess(product);
  } catch (error) {
    const err = error as Error;
    if (err.message === AppErrors.INSUFFICIENT_STOCK) {
      return createError(AppErrors.INSUFFICIENT_STOCK, 'Stock cannot go below zero.');
    }
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to adjust stock');
  }
}
