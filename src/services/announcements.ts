import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { 
  AnnouncementPriority, 
  AnnouncementTargetRole, 
  MembershipRole, 
  NotificationSeverity 
} from '@/generated/prisma/client';
import { recordAuditLog } from './audit';

export async function createAnnouncement(
  businessId: string,
  authorUserId: string,
  data: {
    title: string;
    message: string;
    priority?: AnnouncementPriority;
    targetRole?: AnnouncementTargetRole;
    branchId?: string | null;
    expiresAt?: Date | null;
  }
) {
  const authorMembership = await prisma.businessMembership.findFirst({
    where: { businessId, userId: authorUserId },
  });

  if (!authorMembership || (authorMembership.role !== 'OWNER' && authorMembership.role !== 'MANAGER')) {
    throw new Error('Only store owners and managers can publish announcements.');
  }

  const priority = data.priority || AnnouncementPriority.NORMAL;
  const targetRole = data.targetRole || AnnouncementTargetRole.ALL;

  const announcement = await prisma.announcement.create({
    data: {
      businessId,
      branchId: data.branchId || null,
      authorId: authorUserId,
      title: data.title.trim(),
      message: data.message.trim(),
      priority,
      targetRole,
      expiresAt: data.expiresAt || null,
    },
    include: {
      author: { select: { name: true, email: true } },
    },
  });

  // Emit store-wide notification
  await prisma.notification.create({
    data: {
      businessId,
      type: 'ANNOUNCEMENT',
      severity:
        priority === AnnouncementPriority.URGENT
          ? NotificationSeverity.ALERT
          : priority === AnnouncementPriority.IMPORTANT
          ? NotificationSeverity.WARNING
          : NotificationSeverity.INFO,
      title: `Announcement: ${announcement.title}`,
      message: announcement.message.length > 100 ? `${announcement.message.slice(0, 97)}...` : announcement.message,
      isOwnerOnly: false,
      relatedEntity: 'ANNOUNCEMENT',
      relatedEntityId: announcement.id,
      deduplicationKey: `${businessId}-ANNOUNCEMENT-${announcement.id}`,
    },
  });

  await recordAuditLog({
    businessId,
    userId: authorUserId,
    action: 'ANNOUNCEMENT_CREATED',
    entityType: 'Announcement',
    entityId: announcement.id,
    metadata: { title: announcement.title, priority, targetRole },
  });

  return announcement;
}

export async function listAnnouncements(
  businessId: string,
  userId: string,
  userRole: MembershipRole,
  options: {
    includeArchived?: boolean;
  } = {}
) {
  const now = new Date();

  const where: any = {
    businessId,
    ...(options.includeArchived ? {} : { isArchived: false }),
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
    ],
  };

  // Role Targeting Filter: Owners and managers see all; others see 'ALL' or matching role
  if (userRole !== MembershipRole.OWNER && userRole !== MembershipRole.MANAGER) {
    where.targetRole = { in: ['ALL', userRole] };
  }

  const announcements = await prisma.announcement.findMany({
    where,
    include: {
      author: { select: { name: true, email: true } },
      branch: { select: { id: true, name: true } },
      reads: {
        where: { userId },
        select: { readAt: true },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    priority: a.priority,
    targetRole: a.targetRole,
    expiresAt: a.expiresAt,
    isArchived: a.isArchived,
    createdAt: a.createdAt,
    authorName: a.author.name || a.author.email?.split('@')[0] || 'Management',
    branchName: a.branch?.name || null,
    isRead: a.reads.length > 0,
    readAt: a.reads[0]?.readAt || null,
  }));
}

export async function markAnnouncementRead(
  businessId: string,
  userId: string,
  announcementId: string
) {
  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, businessId },
  });

  if (!announcement) {
    throw new Error('Announcement not found or unauthorized.');
  }

  return prisma.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId,
      },
    },
    create: {
      announcementId,
      userId,
      readAt: new Date(),
    },
    update: {
      readAt: new Date(),
    },
  });
}

export async function archiveAnnouncement(
  businessId: string,
  userId: string,
  announcementId: string
) {
  const membership = await prisma.businessMembership.findFirst({
    where: { businessId, userId },
  });

  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
    throw new Error('Only store owners and managers can archive announcements.');
  }

  const updated = await prisma.announcement.update({
    where: { id: announcementId, businessId },
    data: { isArchived: true },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'ANNOUNCEMENT_ARCHIVED',
    entityType: 'Announcement',
    entityId: announcementId,
    metadata: { title: updated.title },
  });

  return updated;
}
