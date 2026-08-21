import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { NotificationSeverity, MembershipRole } from '@/generated/prisma/client';
import { NotificationType, NotificationSeverityLevel, NotificationFilterOptions } from '@/types/notifications';
import { sendWebPushNotification } from './push';

export type CreateNotificationParams = {
  businessId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity?: NotificationSeverityLevel;
  isOwnerOnly?: boolean;
  recipientId?: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  deduplicationKey?: string;
  actionUrl?: string;
};

export async function createInAppNotification(params: CreateNotificationParams) {
  // 1. Deduplication check: Avoid spamming the same unresolved notification
  if (params.deduplicationKey) {
    const existing = await prisma.notification.findFirst({
      where: {
        businessId: params.businessId,
        deduplicationKey: params.deduplicationKey,
      },
    });

    if (existing) {
      // If notification already exists and is unread, update timestamp rather than duplicating
      if (!existing.isRead) {
        return prisma.notification.update({
          where: { id: existing.id },
          data: {
            title: params.title,
            message: params.message,
            severity: (params.severity as NotificationSeverity) || existing.severity,
            createdAt: new Date(),
          },
        });
      }
      // If already resolved/read, skip creating a duplicate spam record
      return existing;
    }
  }

  // 2. Create In-App Notification
  return prisma.notification.create({
    data: {
      businessId: params.businessId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: (params.severity as NotificationSeverity) || NotificationSeverity.INFO,
      isOwnerOnly: params.isOwnerOnly ?? false,
      recipientId: params.recipientId || null,
      relatedEntity: params.relatedEntity || null,
      relatedEntityId: params.relatedEntityId || null,
      deduplicationKey: params.deduplicationKey || null,
      actionUrl: params.actionUrl || null,
    },
  });
}

export async function sendNotification(params: CreateNotificationParams) {
  // 1. Check Preferences if recipient is specified
  if (params.recipientId) {
    const pref = await getNotificationPreferences(params.recipientId, params.businessId);
    if (params.type === 'LOW_STOCK' && !pref.lowStockAlerts) return null;
    if (params.type === 'SALES_DROP' && !pref.salesDropAlerts) return null;
    if (params.type === 'PROFIT_DROP' && !pref.profitAlerts) return null;
    if (params.type === 'CREDIT_RISK' && !pref.creditAlerts) return null;
    if (params.type === 'EXPENSE_SPIKE' && !pref.expenseAlerts) return null;
    if (params.type === 'NEW_FEEDBACK' && !pref.feedbackAlerts) return null;
    if (params.type === 'LEAVE_REQUEST' && !pref.employeeAlerts) return null;
    if (params.type === 'NEW_MESSAGE' && !pref.messagesAlerts) return null;
    if (params.type === 'DAILY_DIGEST' && !pref.dailyDigest) return null;
  }

  // 2. Create in-app record
  const notification = await createInAppNotification(params);

  // 3. Dispatch Web Push for high-severity or digest events
  const isHighSeverity =
    params.severity === 'CRITICAL' ||
    params.severity === 'WARNING' ||
    params.type === 'DAILY_DIGEST' ||
    params.type === 'NEW_MESSAGE';

  if (isHighSeverity) {
    // Generate privacy-safe lock screen text
    let pushTitle = 'DukaanOS Alert';
    let pushBody = params.title;

    if (params.type === 'DAILY_DIGEST') {
      pushTitle = 'DukaanOS: Daily Business Digest';
      pushBody = 'Your daily store performance report is ready to review.';
    } else if (params.type === 'LOW_STOCK' || params.type === 'OUT_OF_STOCK') {
      pushTitle = 'DukaanOS: Inventory Notice';
      pushBody = 'Product stock levels require immediate attention.';
    } else if (params.type === 'NEW_MESSAGE') {
      pushTitle = 'DukaanOS: Internal Message';
      pushBody = 'You have received a new internal message from your team.';
    }

    try {
      await sendWebPushNotification({
        userId: params.recipientId,
        businessId: params.businessId,
        title: pushTitle,
        body: pushBody,
        url: params.actionUrl || '/dashboard/notifications',
        notificationId: notification.id,
      });
    } catch (err) {
      console.warn('[PushNotification] Error sending web push:', err);
    }
  }

  return notification;
}

export async function listUserNotifications(
  businessId: string,
  userId: string,
  userRole: MembershipRole,
  options: NotificationFilterOptions = {}
) {
  const isOwnerOrManager =
    userRole === MembershipRole.OWNER || userRole === MembershipRole.MANAGER;
  const limit = options.limit || 30;
  const page = options.page || 1;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    businessId,
    // Ordinary cashiers/staff only see notifications targeted to them or non-owner notifications
    ...(!isOwnerOrManager
      ? {
          isOwnerOnly: false,
          OR: [{ recipientId: userId }, { recipientId: null }],
        }
      : {
          OR: [{ recipientId: userId }, { recipientId: null }],
        }),
    ...(options.unreadOnly ? { isRead: false } : {}),
    ...(options.severity && options.severity !== 'ALL'
      ? { severity: options.severity as NotificationSeverity }
      : {}),
    ...(options.type && options.type !== 'ALL' ? { type: options.type } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: whereClause }),
  ]);

  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUnreadNotificationCount(
  businessId: string,
  userId: string,
  userRole: MembershipRole
) {
  const isOwnerOrManager =
    userRole === MembershipRole.OWNER || userRole === MembershipRole.MANAGER;

  return prisma.notification.count({
    where: {
      businessId,
      isRead: false,
      ...(!isOwnerOrManager
        ? {
            isOwnerOnly: false,
            OR: [{ recipientId: userId }, { recipientId: null }],
          }
        : {
            OR: [{ recipientId: userId }, { recipientId: null }],
          }),
    },
  });
}

export async function markNotificationRead(
  businessId: string,
  userId: string,
  notificationId: string
) {
  return prisma.notification.update({
    where: { id: notificationId, businessId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsRead(businessId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      businessId,
      isRead: false,
      OR: [{ recipientId: userId }, { recipientId: null }],
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// ----------------------------------------
// Notification Preferences
// ----------------------------------------

export async function getNotificationPreferences(userId: string, businessId: string) {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId_businessId: { userId, businessId } },
  });

  if (existing) {
    return existing;
  }

  // Create default preferences
  return prisma.notificationPreference.create({
    data: {
      userId,
      businessId,
      lowStockAlerts: true,
      salesDropAlerts: true,
      profitAlerts: true,
      creditAlerts: true,
      expenseAlerts: true,
      feedbackAlerts: true,
      employeeAlerts: true,
      messagesAlerts: true,
      dailyDigest: true,
      dailyDigestTime: '09:00',
      webPushEnabled: false,
    },
  });
}

export async function updateNotificationPreferences(
  userId: string,
  businessId: string,
  updates: {
    lowStockAlerts?: boolean;
    salesDropAlerts?: boolean;
    profitAlerts?: boolean;
    creditAlerts?: boolean;
    expenseAlerts?: boolean;
    feedbackAlerts?: boolean;
    employeeAlerts?: boolean;
    messagesAlerts?: boolean;
    dailyDigest?: boolean;
    dailyDigestTime?: string;
    webPushEnabled?: boolean;
  }
) {
  return prisma.notificationPreference.upsert({
    where: { userId_businessId: { userId, businessId } },
    create: {
      userId,
      businessId,
      ...updates,
    },
    update: {
      ...updates,
    },
  });
}

export async function cleanOldNotifications(businessId: string, daysRetention = 60) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysRetention);

  return prisma.notification.deleteMany({
    where: {
      businessId,
      isRead: true,
      createdAt: { lt: cutoff },
    },
  });
}
