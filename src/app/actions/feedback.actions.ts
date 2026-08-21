'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  generateFeedbackInviteToken,
  verifyFeedbackToken,
  submitCustomerFeedback,
  getFeedbackDashboardStats,
  listBusinessFeedback,
  resolveFeedback,
} from '@/services/feedback';
import {
  submitFeedbackSchema,
  generateFeedbackTokenSchema,
  updateFeedbackStatusSchema,
  feedbackFilterSchema,
} from '@/lib/validations';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

// ----------------------------------------
// Public Actions (No Auth Required, Protected by Unguessable Token)
// ----------------------------------------

export async function verifyFeedbackTokenAction(token: string) {
  try {
    const result = await verifyFeedbackToken(token);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to verify feedback link');
  }
}

export async function submitFeedbackAction(rawData: unknown) {
  try {
    const validated = submitFeedbackSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid feedback submission',
        validated.error.flatten().fieldErrors
      );
    }

    const result = await submitCustomerFeedback(validated.data.token, {
      rating: validated.data.rating,
      category: validated.data.category,
      message: validated.data.message,
      isAnonymous: validated.data.isAnonymous,
    });

    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to submit feedback');
  }
}

// ----------------------------------------
// Authorized Store Management Actions
// ----------------------------------------

export async function generateFeedbackInviteAction(
  businessId: string,
  payload?: unknown
) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.CASHIER,
    ]);

    const validated = generateFeedbackTokenSchema.safeParse(payload || {});
    const params = validated.success ? validated.data : {};

    const invite = await generateFeedbackInviteToken(businessId, {
      customerId: params.customerId || null,
      saleId: params.saleId || null,
      expiresInDays: 30,
    });

    return createSuccess(invite);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to generate feedback link');
  }
}

export async function listFeedbackAction(
  businessId: string,
  rawParams?: unknown
) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = feedbackFilterSchema.safeParse(rawParams || {});
    const params = validated.success ? validated.data : {};

    const result = await listBusinessFeedback(businessId, params as any);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list feedback');
  }
}

export async function getFeedbackStatsAction(businessId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const stats = await getFeedbackDashboardStats(businessId);
    return createSuccess(stats);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch feedback stats');
  }
}

export async function resolveFeedbackAction(
  businessId: string,
  rawData: unknown
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = updateFeedbackStatusSchema.safeParse(rawData);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid status update payload',
        validated.error.flatten().fieldErrors
      );
    }

    const updated = await resolveFeedback(
      businessId,
      user.id,
      validated.data.feedbackId,
      validated.data.status,
      validated.data.resolutionNote
    );

    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update feedback status');
  }
}
