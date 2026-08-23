'use server';

import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
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
    const { user, business } = await getActiveBusiness();
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
    const { user, business } = await getActiveBusiness();
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
  try {
    const result = await submitPublicFeedback(data.businessId, {
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
    return handleError(err);
  }
}