'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import { updateBusinessOpenStatus } from '@/services/monitoring';
import { updateBusinessStatusSchema } from '@/lib/validations';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

export async function toggleBusinessStatusAction(
  businessId: string,
  payload: unknown
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = updateBusinessStatusSchema.safeParse(payload);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid status data',
        validated.error.flatten().fieldErrors
      );
    }

    const updated = await updateBusinessOpenStatus(
      businessId,
      user.id,
      validated.data.isOpen,
      validated.data.operatingHours
    );

    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update business status');
  }
}
