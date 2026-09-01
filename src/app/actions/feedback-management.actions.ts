'use server';

import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { assertOwnerOrManager } from '@/lib/auth/rbac';
import {
  addFeedbackResponse,
  createFeedbackRecord,
  deleteFeedbackRecord,
  submitPublicFeedback,
  updateFeedbackInternalNotes,
  updateFeedbackPriority,
  updateFeedbackStatus,
} from '@/services/feedback-management';
import {
  CommunicationChannel,
  CustomerFeedbackType,
  FeedbackPriority,
  FeedbackWorkflowStatus,
} from '@/generated/prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { enforceRateLimit } from '@/lib/security/rate-limit-action';
import { AppError, ErrorCodes } from '@/lib/errors';

function handleError(err: unknown) {
  const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
  return { success: false as const, message };
}

/**
 * Staff action: manually log a feedback / complaint / review.
 */
export async function createFeedbackAction(data: {
  customerId?: string | null;
  saleId?: string | null;
  productId?: string | null;
  type: CustomerFeedbackType;
  rating?: number | null;
  title: string;
  description: string;
  priority: FeedbackPriority;
}) {
  try {
    const { user, business, membership } = await getActiveBusiness();
    const record = await createFeedbackRecord(
      business.id,
      user.id,
      { ...data, source: 'MANUAL' },
      membership.role
    );
    revalidatePath('/dashboard/feedback');
    return { success: true as const, data: { id: record.id } };
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Staff action: change workflow status (optionally notify customer on resolve).
 */
export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackWorkflowStatus,
  opts: { notifyCustomer?: boolean; channel?: CommunicationChannel } = {}
) {
  try {
    const { user, business, membership } = await getActiveBusiness();
    assertOwnerOrManager(membership.role, 'Only owners and managers can manage feedback workflow.');
    await updateFeedbackStatus(business.id, user.id, feedbackId, status, opts);
    revalidatePath('/dashboard/feedback');
    return { success: true as const };
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Staff action: change priority.
 */
export async function updateFeedbackPriorityAction(
  feedbackId: string,
  priority: FeedbackPriority
) {
  try {
    const { user, business, membership } = await getActiveBusiness();
    assertOwnerOrManager(membership.role, 'Only owners and managers can manage feedback workflow.');
    await updateFeedbackPriority(business.id, user.id, feedbackId, priority);
    revalidatePath('/dashboard/feedback');
    return { success: true as const };
  } catch (err) {
    return handleError(err);
  }
}

/**
 * OWNER/MANAGER action: save internal notes (never exposed to customers).
 */
export async function updateFeedbackInternalNotesAction(
  feedbackId: string,
  notes: string
) {
  try {
    const { user, business, membership } = await getActiveBusiness();
    await updateFeedbackInternalNotes(
      business.id,
      user.id,
      membership.role,
      feedbackId,
      notes
    );
    revalidatePath('/dashboard/feedback');
    return { success: true as const };
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Staff action: respond on a feedback thread. Internal responses require
 * OWNER/MANAGER; public responses queue a Step 28 communication to the customer.
 */
export async function addFeedbackResponseAction(
  feedbackId: string,
  message: string,
  isInternal: boolean,
  channel: CommunicationChannel = CommunicationChannel.WHATSAPP
) {
  try {
    const { user, business, membership } = await getActiveBusiness();
    // Customer-visible replies are a staff-only channel.
    if (!isInternal) {
      assertOwnerOrManager(membership.role, 'Only owners and managers can manage feedback workflow.');
    }
    await addFeedbackResponse(
      business.id,
      user.id,
      membership.role,
      feedbackId,
      message,
      isInternal,
      { channel }
    );
    revalidatePath('/dashboard/feedback');
    return { success: true as const };
  } catch (err) {
    return handleError(err);
  }
}

/**
 * OWNER/MANAGER action: delete a feedback record.
 */
export async function deleteFeedbackAction(feedbackId: string) {
  try {
    const { user, business, membership } = await getActiveBusiness();
    await deleteFeedbackRecord(business.id, user.id, membership.role, feedbackId);
    revalidatePath('/dashboard/feedback');
    return { success: true as const };
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PUBLIC action (unauthenticated): customer-facing submission from the
 * shareable feedback form. Never touches internalNotes.
 *
 * Security (P2-02): unauthenticated submissions are rate-limited per business
 * and per client address using the existing PUBLIC_FEEDBACK configuration
 * (fail-closed limiter). Error responses never distinguish unknown/inactive
 * businesses from validation failures beyond explicit validation messages,
 * so the endpoint is not a business-existence oracle (P3-24).
 */
export async function submitPublicFeedbackAction(data: {
  businessId: string;
  customerName?: string | null;
  phone?: string | null;
  type: CustomerFeedbackType;
  rating?: number | null;
  title: string;
  description: string;
  productId?: string | null;
}) {
  const businessId = typeof data.businessId === 'string' && data.businessId.trim()
    ? data.businessId.trim()
    : 'unknown';

  let clientKey = 'unknown';
  try {
    const hdrs = await headers();
    clientKey = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  } catch {
    // headers() unavailable — fall back to a constant key (limit still applies)
  }

  try {
    await enforceRateLimit('PUBLIC_FEEDBACK', `${clientKey}|${businessId}`);
  } catch {
    return {
      success: false as const,
      message: 'Too many requests. Please try again later.',
    };
  }

  try {
    const result = await submitPublicFeedback(businessId, {
      customerName: data.customerName,
      phone: data.phone,
      type: data.type,
      rating: data.rating,
      title: data.title,
      description: data.description,
      productId: data.productId,
    });
    return {
      success: true as const,
      businessName: result.businessName,
      message: 'Thank you! Your feedback has been received.',
    };
  } catch (err) {
    if (err instanceof AppError && err.code === ErrorCodes.VALIDATION_ERROR) {
      return { success: false as const, message: err.message };
    }
    // Generic response for every other failure (including unknown/inactive
    // businesses) so anonymous callers learn nothing about account existence.
    return {
      success: false as const,
      message: 'Unable to submit feedback right now. Please try again later.',
    };
  }
}