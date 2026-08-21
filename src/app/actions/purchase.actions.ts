'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { purchaseCreateSchema, purchaseFilterSchema, purchaseCancelSchema } from '@/lib/validations';
import { createPurchase, getPurchaseById, listPurchases, cancelPurchase } from '@/services/purchases';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
import { MembershipRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';

export async function createPurchaseAction(businessId: string, payload: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validatedData = purchaseCreateSchema.safeParse(payload);
    if (!validatedData.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid purchase data',
        validatedData.error.flatten().fieldErrors
      );
    }

    const purchase = await createPurchase({
      businessId,
      userId: user.id,
      ...validatedData.data,
    });

    return createSuccess(purchase);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create purchase');
  }
}

export async function getPurchaseAction(businessId: string, purchaseId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
      MembershipRole.EMPLOYEE,
    ]);

    const purchase = await getPurchaseById(businessId, purchaseId);
    if (!purchase) {
      return createError(AppErrors.NOT_FOUND, 'Purchase invoice not found');
    }

    return createSuccess(purchase);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch purchase');
  }
}

export async function listPurchasesAction(businessId: string, filters: unknown) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const validatedFilters = purchaseFilterSchema.safeParse(filters);
    const filterData = validatedFilters.success ? validatedFilters.data : {};

    const result = await listPurchases(businessId, filterData);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list purchases');
  }
}

export async function cancelPurchaseAction(
  businessId: string,
  purchaseId: string,
  reason: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = purchaseCancelSchema.safeParse({ reason });
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Cancellation reason must be provided (at least 3 characters).'
      );
    }

    const purchase = await cancelPurchase(businessId, user.id, purchaseId, validated.data.reason);
    return createSuccess(purchase);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to cancel purchase');
  }
}

export async function searchProductsForPurchaseAction(businessId: string, query: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const trimmed = query.trim();
    if (!trimmed) {
      const products = await prisma.product.findMany({
        where: { businessId, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          unit: true,
          purchasePrice: true,
          sellingPrice: true,
          currentStock: true,
        },
        orderBy: { name: 'asc' },
        take: 20,
      });

      return createSuccess(
        products.map((p) => ({
          ...p,
          purchasePrice: Number(p.purchasePrice),
          sellingPrice: Number(p.sellingPrice),
        }))
      );
    }

    const products = await prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { sku: { contains: trimmed, mode: 'insensitive' } },
          { barcode: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        unit: true,
        purchasePrice: true,
        sellingPrice: true,
        currentStock: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    return createSuccess(
      products.map((p) => ({
        ...p,
        purchasePrice: Number(p.purchasePrice),
        sellingPrice: Number(p.sellingPrice),
      }))
    );
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to search products');
  }
}
