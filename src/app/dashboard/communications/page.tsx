import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listUserConversations } from '@/services/communications';
import { listAnnouncements } from '@/services/announcements';
import { redirect } from 'next/navigation';
import {
  CommunicationsPageClient,
  type ConversationPageData,
  type AnnouncementPageData,
} from './communications-page-client';

export default async function CommunicationsPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  const [fetchedConversations, fetchedAnnouncements] = await Promise.all([
    listUserConversations(business.id, user.id),
    listAnnouncements(business.id, user.id, membership.role),
  ]);

  const initialConversations: ConversationPageData[] = fetchedConversations.map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    updatedAt: c.updatedAt.toISOString(),
    otherUser: c.otherUser
      ? {
          id: c.otherUser.id,
          name: c.otherUser.name,
          email: c.otherUser.email,
          position: c.otherUser.position,
          employeeCode: c.otherUser.employeeCode,
        }
      : null,
    lastMessage: c.lastMessage
      ? {
          content: c.lastMessage.content,
          createdAt: c.lastMessage.createdAt.toISOString(),
          senderId: c.lastMessage.senderId,
        }
      : null,
    unreadCount: c.unreadCount,
  }));

  const initialAnnouncements: AnnouncementPageData[] = fetchedAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    priority: a.priority,
    targetRole: a.targetRole,
    expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
    isArchived: a.isArchived,
    createdAt: a.createdAt.toISOString(),
    authorName: a.authorName,
    branchName: a.branchName,
    isRead: a.isRead,
    readAt: a.readAt ? a.readAt.toISOString() : null,
  }));

  return (
    <CommunicationsPageClient
      businessId={business.id}
      currentUserId={user.id}
      userRole={membership.role}
      initialConversations={initialConversations}
      initialAnnouncements={initialAnnouncements}
    />
  );
}
