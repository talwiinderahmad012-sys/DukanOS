'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { customerSchema, customerPaymentSchema } from '@/lib/validations';
import { createCustomer, recordCustomerPayment, getCustomersList } from '@/services/customers';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
import { MembershipRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';

export async function createCustomerAction(businessId: string, payload: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const validated = customerSchema.safeParse(payload);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid customer information',
        validated.error.flatten().fieldErrors
      );
    }

    const customer = await createCustomer(businessId, user.id, validated.data);
    return createSuccess(customer);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create customer');
  }
}

export async function recordCustomerPaymentAction(businessId: string, payload: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const validated = customerPaymentSchema.safeParse(payload);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid payment information',
        validated.error.flatten().fieldErrors
      );
    }

    const updatedCustomer = await recordCustomerPayment(
      businessId,
      user.id,
      validated.data.customerId,
      validated.data.amount,
      validated.data.method,
      validated.data.notes
    );

    return createSuccess(updatedCustomer);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to record customer payment');
  }
}

export async function searchCustomersAction(businessId: string, query: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const trimmed = query.trim();
    if (!trimmed) {
      const customers = await prisma.customer.findMany({
        where: { businessId, isActive: true },
        select: {
          id: true,
          name: true,
          phone: true,
          outstanding: true,
        },
        orderBy: { name: 'asc' },
        take: 20,
      });

      return createSuccess(
        customers.map((c) => ({
          ...c,
          outstanding: Number(c.outstanding),
        }))
      );
    }

    const customers = await prisma.customer.findMany({
      where: {
        businessId,
        isActive: true,
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { phone: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        outstanding: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    return createSuccess(
      customers.map((c) => ({
        ...c,
        outstanding: Number(c.outstanding),
      }))
    );
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to search customers');
  }
}

export async function updateCustomerAction(
  businessId: string,
  customerId: string,
  payload: unknown
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const { updateCustomerSchema } = await import('@/lib/validations');
    const validated = updateCustomerSchema.safeParse(payload);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid customer update payload',
        validated.error.flatten().fieldErrors
      );
    }

    const { updateCustomer } = await import('@/services/customers');
    const updated = await updateCustomer(businessId, user.id, customerId, validated.data as any);
    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update customer');
  }
}

export async function archiveCustomerAction(
  businessId: string,
  customerId: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const { archiveCustomer } = await import('@/services/customers');
    const archived = await archiveCustomer(businessId, user.id, customerId);
    return createSuccess(archived);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to archive customer');
  }
}

