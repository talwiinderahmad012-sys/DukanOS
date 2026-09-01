'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  listUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notifications';
import {
  registerPushSubscription,
  deactivatePushSubscription,
  getPublicVapidKey,
  PushSubscriptionPayload,
} from '@/services/push';
import { generateDailyBusinessDigest } from '@/services/digest';
import { createError, createSuccess, AppErrors, actionError } from '@/lib/utils/api-response';

export async function listNotificationsAction(
  businessId: string,
  options: any = {}
) {
  try {
    const { user, membership } = await requireBusinessAccess(businessId);
    const result = await listUserNotifications(
      businessId,
      user.id,
      membership.role,
      options
    );
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to list notifications');
  }
}

export async function getUnreadNotificationsCountAction(businessId: string) {
  try {
    const { user, membership } = await requireBusinessAccess(businessId);
    const count = await getUnreadNotificationCount(businessId, user.id, membership.role);
    return createSuccess({ count });
  } catch (error) {
    return actionError(error, 'Failed to get unread count');
  }
}

export async function markNotificationReadAction(
  businessId: string,
  notificationId: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    await markNotificationRead(businessId, user.id, notificationId);
    return createSuccess({ marked: true });
  } catch (error) {
    return actionError(error, 'Failed to mark notification read');
  }
}

export async function markAllNotificationsReadAction(businessId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    await markAllNotificationsRead(businessId, user.id);
    return createSuccess({ markedAll: true });
  } catch (error) {
    return actionError(error, 'Failed to mark all read');
  }
}

export async function getNotificationPreferencesAction(businessId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const preferences = await getNotificationPreferences(user.id, businessId);
    return createSuccess(preferences);
  } catch (error) {
    return actionError(error, 'Failed to load preferences');
  }
}

export async function updateNotificationPreferencesAction(
  businessId: string,
  updates: any
) {
  try {
    const { user, membership } = await requireBusinessAccess(businessId);
    
    // Disallow non-owners from toggling owner-only financial digest / alerts
    const isOwnerOrManager =
      membership.role === MembershipRole.OWNER ||
      membership.role === MembershipRole.MANAGER;

    const safeUpdates = {
      ...updates,
      ...(!isOwnerOrManager
        ? {
            profitAlerts: false,
            salesDropAlerts: false,
            expenseAlerts: false,
            dailyDigest: false,
          }
        : {}),
    };

    const updated = await updateNotificationPreferences(user.id, businessId, safeUpdates);
    return createSuccess(updated);
  } catch (error) {
    return actionError(error, 'Failed to update preferences');
  }
}

export async function getVapidPublicKeyAction() {
  try {
    const key = getPublicVapidKey();
    return createSuccess({ publicKey: key });
  } catch (error) {
    return actionError(error, 'Failed to get VAPID key');
  }
}

export async function savePushSubscriptionAction(
  businessId: string,
  subscription: PushSubscriptionPayload
) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const result = await registerPushSubscription(user.id, businessId, subscription);
    // Automatically enable webPushEnabled in preferences
    await updateNotificationPreferences(user.id, businessId, { webPushEnabled: true });
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to save push subscription');
  }
}

export async function removePushSubscriptionAction(
  businessId: string,
  endpoint: string
) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    await deactivatePushSubscription(user.id, endpoint);
    await updateNotificationPreferences(user.id, businessId, { webPushEnabled: false });
    return createSuccess({ unsubscribed: true });
  } catch (error) {
    return actionError(error, 'Failed to remove push subscription');
  }
}

export async function triggerDailyDigestAction(businessId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const result = await generateDailyBusinessDigest(businessId);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to generate daily digest');
  }
}
