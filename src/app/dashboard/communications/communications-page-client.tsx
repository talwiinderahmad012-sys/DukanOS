'use client';

import {
  CommunicationsView,
  type ConversationData,
  type AnnouncementData,
} from '@/components/communications/communications-view';

export type ConversationPageData = ConversationData;
export type AnnouncementPageData = AnnouncementData;

export function CommunicationsPageClient({
  businessId,
  currentUserId,
  userRole,
  initialConversations,
  initialAnnouncements,
}: {
  businessId: string;
  currentUserId: string;
  userRole: string;
  initialConversations: ConversationPageData[];
  initialAnnouncements: AnnouncementPageData[];
}) {
  return (
    <div className="max-w-6xl mx-auto">
      <CommunicationsView
        businessId={businessId}
        currentUserId={currentUserId}
        userRole={userRole}
        initialConversations={initialConversations}
        initialAnnouncements={initialAnnouncements}
      />
    </div>
  );
}
