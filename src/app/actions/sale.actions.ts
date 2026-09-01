'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { saleSchema, saleFilterSchema, saleCancelSchema } from '@/lib/validations';
import { createSale, getSaleById, listSales, cancelSale } from '@/services/sales';
import { createError, createSuccess, AppErrors, actionError } from '@/lib/utils/api-response';
import { MembershipRole } from '@/generated/prisma/client';
import { AppError, ErrorCodes } from '@/lib/errors';

export async function createSaleAction(businessId: string, payload: unknown) {
  try {
    // Authorize (Owners, Managers, and Cashiers can sell)
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const validatedData = saleSchema.safeParse(payload);
    if (!validatedData.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid sale data',
        validatedData.error.flatten().fieldErrors
      );
    }

    const sale = await createSale({
      businessId,
      userId: user.id,
      ...validatedData.data,
    });

    return createSuccess(sale);
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCodes.INSUFFICIENT_STOCK) {
      return createError(
        ErrorCodes.INSUFFICIENT_STOCK,
        'Not enough stock available for one or more items to complete this sale.'
      );
    }
    return actionError(error, 'Failed to create sale');
  }
}

export async function getSaleAction(businessId: string, saleId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const sale = await getSaleById(businessId, saleId);
    if (!sale) {
      return createError(AppErrors.NOT_FOUND, 'Sale invoice not found');
    }

    return createSuccess(sale);
  } catch (error) {
    return actionError(error, 'Failed to fetch sale');
  }
}

export async function listSalesAction(businessId: string, filters: unknown) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const validated = saleFilterSchema.safeParse(filters);
    const filterData = validated.success ? validated.data : {};

    const result = await listSales(businessId, filterData);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to list sales');
  }
}

export async function cancelSaleAction(businessId: string, saleId: string, reason: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = saleCancelSchema.safeParse({ reason });
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'A cancellation reason of at least 3 characters is required.'
      );
    }

    const sale = await cancelSale(businessId, user.id, saleId, validated.data.reason);
    return createSuccess(sale);
  } catch (error) {
    return actionError(error, 'Failed to cancel sale');
  }
}
