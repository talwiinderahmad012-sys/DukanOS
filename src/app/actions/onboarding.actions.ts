'use server';

import { requireAuthenticatedUser } from '@/lib/auth/context';
import { createBusinessForUser } from '@/services/onboarding';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
import { BusinessType } from '@/generated/prisma/client';
import { z } from 'zod';

const onboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.nativeEnum(BusinessType),
  currency: z.string().min(3),
  timezone: z.string().min(2),
  branchName: z.string().min(2).default("Main Branch"),
  city: z.string().optional(),
});

export async function submitOnboardingAction(formData: Record<string, unknown>) {
  try {
    const { id: userId } = await requireAuthenticatedUser();

    const validatedData = onboardingSchema.safeParse(formData);
    if (!validatedData.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid data', validatedData.error.flatten().fieldErrors);
    }

    const business = await createBusinessForUser(userId, validatedData.data);
    
    return createSuccess({ businessId: business.id });
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to complete onboarding');
  }
}
