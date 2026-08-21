'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { supplierSchema } from '@/lib/validations';
import { createSupplier, updateSupplier, archiveSupplier } from '@/services/suppliers';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
import { MembershipRole } from '@/generated/prisma/client';
import { revalidatePath } from 'next/cache';

const allowedRoles = [MembershipRole.OWNER, MembershipRole.MANAGER];

export async function createSupplierAction(businessId: string, formData: any) {
  try {
    const { user } = await requireBusinessAccess(businessId, allowedRoles);
    const validatedData = supplierSchema.safeParse(formData);
    if (!validatedData.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid supplier data', validatedData.error.flatten().fieldErrors);
    }
    const supplier = await createSupplier(businessId, user.id, validatedData.data);
    revalidatePath('/dashboard/suppliers');
    return createSuccess(supplier);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create supplier');
  }
}

export async function updateSupplierAction(businessId: string, supplierId: string, formData: any) {
  try {
    const { user } = await requireBusinessAccess(businessId, allowedRoles);
    const validatedData = supplierSchema.safeParse(formData);
    if (!validatedData.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid supplier data', validatedData.error.flatten().fieldErrors);
    }
    const supplier = await updateSupplier(businessId, user.id, supplierId, validatedData.data);
    revalidatePath('/dashboard/suppliers');
    return createSuccess(supplier);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update supplier');
  }
}

export async function archiveSupplierAction(businessId: string, supplierId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, allowedRoles);
    const supplier = await archiveSupplier(businessId, user.id, supplierId);
    revalidatePath('/dashboard/suppliers');
    return createSuccess(supplier);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to archive supplier');
  }
}
