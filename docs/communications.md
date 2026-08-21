# DukaanOS — Internal Communication, Activity Center & Remote Management (Step 12)

## Overview
Step 12 introduces direct internal team communication, business broadcasts/announcements, a centralized role-filtered activity center, and a remote business operational monitoring cockpit to DukaanOS.

---

## Key Architecture Components

### 1. Internal Direct Messaging
- **Route**: `/dashboard/communications`
- **Security & Multi-Tenant Boundaries**:
  - Direct messaging is strictly restricted to members of the same `businessId`.
  - Authenticated user $\rightarrow$ verified business membership $\rightarrow$ verified conversation participant.
  - Cross-tenant messaging attempts are rejected at the database and service layers.
- **Unread Count Tracking**:
  - Calculated dynamically per participant by comparing `Message.createdAt > ConversationParticipant.lastReadAt` (excluding own messages).
  - Marking a conversation as read updates `ConversationParticipant.lastReadAt`.
- **In-App Notifications**:
  - Sending a direct message dispatches an in-app `Notification` with type `DIRECT_MESSAGE` to the recipient.

### 2. Store Announcements & Broadcasts
- **Capabilities**:
  - Published by `OWNER` or `MANAGER`.
  - Priorities: `NORMAL`, `IMPORTANT`, `URGENT`.
  - Role-targeted audiences: `ALL`, `OWNER`, `MANAGER`, `CASHIER`, `EMPLOYEE`.
  - Optional auto-expiration (`expiresAt`) and manual archiving.
  - Read receipts tracked per member via `AnnouncementRead`.

### 3. Centralized Activity Center & Audit Stream
- **Route**: `/dashboard/activity`
- **Chronological Feed Categories**:
  - `SALES` (Checkouts, cancellations)
  - `INVENTORY` (Purchases, stock adjustments)
  - `STAFF` (Leave requests, attendance)
  - `CUSTOMER` (Udhaar debt payments, profile updates, reviews)
  - `ADMIN` (Announcements, settings)
- **Role-Based Privacy Protections**:
  - Ordinary staff (`CASHIER`, `EMPLOYEE`) cannot see confidential salary records or workplace complaints.
  - Raw JSON audit metadata is sanitized.

### 4. Remote Business Monitoring Cockpit
- **Route**: `/dashboard/monitoring`
- **Live Remote Visibility**:
  - **Business Status**: Open / Closed toggle and configured operating hours.
  - **Today's Financials**: Real-time sales, order count, and gross profit.
  - **Live Staff Attendance**: Present, late, absent, on leave, and unrecorded attendance.
  - **Owner Action Center**: Immediate counts and direct navigation links for low stock items, overdue credit, pending leaves, open grievances, and low customer feedback ratings.

---

## Domain Services
- `src/services/communications.ts`:
  - `getOrCreateDirectConversation(businessId, currentUserId, targetUserId)`
  - `listUserConversations(businessId, currentUserId)`
  - `getConversationMessages(businessId, currentUserId, conversationId)`
  - `sendMessage(businessId, currentUserId, conversationId, content)`
  - `markConversationRead(businessId, currentUserId, conversationId)`
  - `getUnreadMessagesCount(businessId, currentUserId)`
  - `listBusinessMembersForMessaging(businessId, currentUserId)`
- `src/services/announcements.ts`:
  - `createAnnouncement(businessId, authorUserId, data)`
  - `listAnnouncements(businessId, userId, userRole, options)`
  - `markAnnouncementRead(businessId, userId, announcementId)`
  - `archiveAnnouncement(businessId, userId, announcementId)`
- `src/services/activity.ts`:
  - `getBusinessActivityFeed(businessId, userRole, options)`
- `src/services/monitoring.ts`:
  - `getRemoteBusinessStatus(businessId)`
  - `updateBusinessOpenStatus(businessId, userId, isOpen, operatingHours)`

---

## Verification
- Automated integration test suite: `src/scripts/test_communications_activity.ts` (7 automated tests passing).
- Production build: `npm run build` (31 Next.js routes compiled cleanly).
