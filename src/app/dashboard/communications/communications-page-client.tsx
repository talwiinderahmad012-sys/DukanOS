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
  providerStatus,
  customerLogs,
  templates,
  automations,
}: {
  businessId: string;
  currentUserId: string;
  userRole: string;
  initialConversations: ConversationPageData[];
  initialAnnouncements: AnnouncementPageData[];
  providerStatus: any;
  customerLogs: any[];
  templates: any[];
  automations: any[];
}) {
  return (
    <div className="max-w-6xl mx-auto">
      <CommunicationsView
        businessId={businessId}
        currentUserId={currentUserId}
        userRole={userRole}
        initialConversations={initialConversations}
        initialAnnouncements={initialAnnouncements}
        providerStatus={providerStatus}
        customerLogs={customerLogs}
        templates={templates}
        automations={automations}
      />
    </div>
  );
}
