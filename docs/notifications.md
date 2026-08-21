# DukaanOS — Advanced Notifications, Web Push & Owner Daily Digest (Step 14)

## Overview
Step 14 implements a centralized, multi-channel notification and alert system for DukaanOS, supporting in-app alerts, browser Web Push notifications via Service Worker, automated deduplication, and timezone-aware daily business digests for store owners.

---

## 1. Notification Architecture

DukaanOS distinguishes three notification channels:
1. **In-App Notification Hub (`/dashboard/notifications`)**: Stored in PostgreSQL with read/unread tracking, severity categorizations, pagination, and direct navigation links.
2. **Browser Web Push Notifications**: Delivered via W3C Push API and Service Worker (`public/sw.js`) with VAPID signing.
3. **Owner Daily Business Digest**: Timezone-aware morning performance digests calculated from real sales, gross profit, and operational alerts.

---

## 2. Notification Types & Severities

### Centralized Types
- `LOW_STOCK`, `OUT_OF_STOCK`: Inventory thresholds and zero stock events.
- `SALES_DROP`, `PROFIT_DROP`: Revenue or margin declines detected by Business Advisor.
- `CREDIT_RISK`: Excessive customer credit / Udhaar exposure.
- `EXPENSE_SPIKE`: Sudden spikes in store operational expenses.
- `NEW_FEEDBACK`, `LOW_RATING`: Customer reviews (≤ 2 stars alert store managers).
- `LEAVE_REQUEST`, `IMPORTANT_COMPLAINT`: Staff leave applications and urgent grievances.
- `NEW_MESSAGE`, `ANNOUNCEMENT`: Internal team messages and store broadcasts.
- `DAILY_DIGEST`: Comprehensive morning executive summary for store owners.
- `SYSTEM`: Platform, subscription, and account notifications.

### Severities
- `INFO`: General updates, morning digests, informational notices.
- `SUCCESS`: Approvals, sync completions, payment confirmations.
- `WARNING`: Low stock thresholds, pending leave requests, high credit exposures.
- `CRITICAL`: Out of stock, severe profit drop, urgent employee complaints.

---

## 3. Deduplication & Anti-Spam Engine

Ongoing business conditions use deterministic deduplication keys to prevent alert flooding:
```text
deduplicationKey: ${type}-${businessId}-${relatedEntityId}-${periodKey}
Example: LOW_STOCK-biz_123-prod_456-2026-08
```
- If an alert with the same deduplication key is triggered again, the existing record's timestamp and message are updated rather than creating duplicate rows.
- If the previous notification was resolved/read, redundant spam notifications are prevented.

---

## 4. Web Push & Service Worker Integration

### Subscription Lifecycle
- Push subscriptions are recorded in the `PushSubscription` model with `endpoint`, `p256dh`, and `auth` keys.
- Multi-device support allows a single user to maintain active subscriptions on mobile phones, tablets, and desktop browsers simultaneously.
- When an endpoint returns `410 Gone` or `404 Not Found`, the subscription is automatically marked `isActive: false` (safe dead subscription cleanup).

### Lock-Screen Privacy Safeguards
To protect retail confidentiality on shared or locked screens, push notifications never expose private revenue or financial totals in notification banners:
- Bad: *"Store made Rs. 45,000 today and gross margin is down."*
- Good: *"DukaanOS: Your daily business report is ready to review."*

### Service Worker Handlers (`public/sw.js`)
- `push` event: Parses notification payload and invokes `self.registration.showNotification()`.
- `notificationclick` event: Closes notification and opens or focuses the target authenticated deep link (e.g. `/dashboard/reports/daily` or `/dashboard/inventory`).

---

## 5. Owner Daily Business Digest

### Generation & Metrics
- Service `generateDailyBusinessDigest(businessId, targetDate)` computes:
  - Yesterday's Total Sales & Order Count.
  - Yesterday's Realized Gross Profit.
  - Revenue Growth % compared to Day Before Yesterday.
  - Top Operational Alerts (Low stock products, pending leaves, low reviews).
  - Actionable recommendations.

### Timezone & Idempotency Guarantee
- Digest calculations respect `Business.timezone` (e.g. `Asia/Karachi`).
- Enforces strict idempotency with key: `DAILY_DIGEST-${businessId}-${yesterdayDateStr}`.
- Running a scheduled cron job or manual trigger multiple times for the same day will **never** generate duplicate digests.

---

## 6. Notification Preferences (`/dashboard/settings/notifications`)

Store members can configure granular notification preferences in `NotificationPreference`:
- Web Push toggle (with user permission consent flow).
- Alert category checkboxes (Low Stock, Sales Drop, Credit Risk, Feedback, Messages, etc.).
- Daily Digest toggle & preferred morning time picker (e.g. `"09:00"`).
- **Role Permissions**: Cashiers and ordinary staff cannot view or toggle owner-only financial alerts.

---

## 7. Verification & Tests
- Automated test suite: [`src/scripts/test_advanced_notifications.ts`](file:///d:/DukanOS/src/scripts/test_advanced_notifications.ts) (6/6 tests passing).
- Production build: `npm run build` (All 34 Next.js routes compiled cleanly).
