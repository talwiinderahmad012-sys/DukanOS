import 'server-only';
import webpush from 'web-push';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logging';

// VAPID keys must come exclusively from environment secrets — never from
// source-code fallbacks. A missing/invalid configuration disables web push
// instead of silently using shared development keys.
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@dukaanos.com';

let vapidConfigured = false;
let vapidAttempted = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  if (vapidAttempted) return false;
  vapidAttempted = true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    logger.warn('Web push disabled: VAPID keys not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).', {
      category: 'PUSH',
    });
    return false;
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    logger.warn(`Web push disabled: invalid VAPID configuration (${err instanceof Error ? err.message : 'unknown error'}).`, {
      category: 'PUSH',
    });
    return false;
  }
}

/** Public VAPID key for browser subscription. Empty string when unconfigured. */
export function getPublicVapidKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
}

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceLabel?: string;
};

export async function registerPushSubscription(
  userId: string,
  businessId: string | null,
  subscription: PushSubscriptionPayload
) {
  const { endpoint, keys, userAgent, deviceLabel } = subscription;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Invalid push subscription payload');
  }

  // Upsert subscription by unique endpoint
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      businessId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
      deviceLabel: deviceLabel || null,
      isActive: true,
      lastSeenAt: new Date(),
    },
    update: {
      userId,
      businessId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
      deviceLabel: deviceLabel || null,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });
}

export async function deactivatePushSubscription(userId: string, endpoint: string) {
  return prisma.pushSubscription.updateMany({
    where: { userId, endpoint },
    data: { isActive: false },
  });
}

export async function sendWebPushNotification(params: {
  userId?: string;
  userIds?: string[];
  businessId?: string;
  title: string;
  body: string;
  url?: string;
  notificationId?: string;
}) {
  const targetUserIds = params.userIds || (params.userId ? [params.userId] : []);
  if (targetUserIds.length === 0 && !params.businessId) {
    return { sent: 0, failed: 0 };
  }

  // Skip (without raising) when VAPID is not configured, so notification flows
  // degrade gracefully rather than erroring in environments without push keys.
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0 };
  }

  // Find all active subscriptions for target users / business
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      isActive: true,
      ...(targetUserIds.length > 0 ? { userId: { in: targetUserIds } } : {}),
      ...(params.businessId ? { businessId: params.businessId } : {}),
    },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Respect the webPushEnabled notification preference per user/business.
  // Users without an explicit enabled preference row never receive pushes
  // (fail closed: preference disabled or missing => no delivery).
  const uniqueUserIds = Array.from(new Set(subscriptions.map((s) => s.userId)));
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: uniqueUserIds } },
    select: { userId: true, businessId: true, webPushEnabled: true },
  });
  const enabledPrefKeys = new Set(
    prefs.filter((p) => p.webPushEnabled).map((p) => `${p.userId}|${p.businessId}`)
  );
  const eligibleSubscriptions = subscriptions.filter((s) =>
    s.businessId
      ? enabledPrefKeys.has(`${s.userId}|${s.businessId}`)
      : prefs.some((p) => p.userId === s.userId && p.webPushEnabled)
  );

  if (eligibleSubscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Safe lock-screen payload (ensures privacy)
  const pushPayload = JSON.stringify({
    title: params.title,
    body: params.body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: {
      url: params.url || '/dashboard/notifications',
      notificationId: params.notificationId,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of eligibleSubscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, pushPayload);
      sent += 1;
      // Update last seen
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastSeenAt: new Date() },
      });
    } catch (error: any) {
      failed += 1;
      // If subscription expired or was unsubscribed on client (410 Gone / 404 Not Found)
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      }
    }
  }

  return { sent, failed };
}
