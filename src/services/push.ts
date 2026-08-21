import 'server-only';
import webpush from 'web-push';
import { prisma } from '@/lib/db/prisma';

// Standard fallback VAPID keys for development if not explicitly configured in environment
const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'UUxI4O8vI8y_N4oE3hV_WzL3y6I9pX2A_1kK6tT7qQs';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@dukaanos.com';

// Configure web-push with VAPID details
try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    DEFAULT_VAPID_PUBLIC_KEY,
    DEFAULT_VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.warn('[WebPush] VAPID configuration notice:', err);
}

export function getPublicVapidKey(): string {
  return DEFAULT_VAPID_PUBLIC_KEY;
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

  for (const sub of subscriptions) {
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
