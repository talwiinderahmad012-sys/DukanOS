'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  getOrCreateDirectConversation,
  listUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  getUnreadMessagesCount,
  listBusinessMembersForMessaging,
} from '@/services/communications';
import {
  createAnnouncement,
  listAnnouncements,
  markAnnouncementRead,
  archiveAnnouncement,
} from '@/services/announcements';
import {
  createConversationSchema,
  sendMessageSchema,
  createAnnouncementSchema,
} from '@/lib/validations';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

// ----------------------------------------
// Direct Messaging Actions
// ----------------------------------------

export async function listStoreMembersAction(businessId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const members = await listBusinessMembersForMessaging(businessId, user.id);
    return createSuccess(members);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list store members');
  }
}

export async function startDirectConversationAction(
  businessId: string,
  payload: unknown
) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const validated = createConversationSchema.safeParse(payload);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid conversation parameters',
        validated.error.flatten().fieldErrors
      );
    }

    const conversation = await getOrCreateDirectConversation(
      businessId,
      user.id,
      validated.data.targetUserId
    );

    if (validated.data.initialMessage) {
      await sendMessage(
        businessId,
        user.id,
        conversation.id,
        validated.data.initialMessage
      );
    }

    return createSuccess(conversation);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to start conversation');
  }
}

export async function sendMessageAction(
  businessId: string,
  payload: unknown
) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const validated = sendMessageSchema.safeParse(payload);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid message content',
        validated.error.flatten().fieldErrors
      );
    }

    const message = await sendMessage(
      businessId,
      user.id,
      validated.data.conversationId,
      validated.data.content
    );

    return createSuccess(message);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to send message');
  }
}

export async function getConversationMessagesAction(
  businessId: string,
  conversationId: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const result = await getConversationMessages(businessId, user.id, conversationId);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to load messages');
  }
}

export async function markConversationReadAction(
  businessId: string,
  conversationId: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    await markConversationRead(businessId, user.id, conversationId);
    return createSuccess({ marked: true });
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to mark conversation read');
  }
}

export async function getUnreadMessagesCountAction(businessId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const count = await getUnreadMessagesCount(businessId, user.id);
    return createSuccess({ count });
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to get unread count');
  }
}

// ----------------------------------------
// Announcement Actions
// ----------------------------------------

export async function createAnnouncementAction(
  businessId: string,
  payload: unknown
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const validated = createAnnouncementSchema.safeParse(payload);
    if (!validated.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid announcement data',
        validated.error.flatten().fieldErrors
      );
    }

    const announcement = await createAnnouncement(businessId, user.id, {
      title: validated.data.title,
      message: validated.data.message,
      priority: validated.data.priority as any,
      targetRole: validated.data.targetRole as any,
      branchId: validated.data.branchId,
      expiresAt: validated.data.expiresAt ? new Date(validated.data.expiresAt) : null,
    });

    return createSuccess(announcement);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to publish announcement');
  }
}

export async function markAnnouncementReadAction(
  businessId: string,
  announcementId: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    await markAnnouncementRead(businessId, user.id, announcementId);
    return createSuccess({ read: true });
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to acknowledge announcement');
  }
}

export async function archiveAnnouncementAction(
  businessId: string,
  announcementId: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const archived = await archiveAnnouncement(businessId, user.id, announcementId);
    return createSuccess(archived);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to archive announcement');
  }
}
