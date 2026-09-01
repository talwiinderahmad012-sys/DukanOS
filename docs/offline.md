# DukaanOS — PWA, Offline Mode & Synchronization Foundation (Step 13)

## Overview
Step 13 equips DukaanOS with Progressive Web App (PWA) installation capabilities, service worker caching, network loss resilience, an IndexedDB synchronization queue, and server-authoritative financial idempotency for offline POS sales.

---

## Architecture Principles

### 1. PWA Installation & App Manifest
- **Manifest**: `public/manifest.json` configured with DukaanOS retail branding, `display: standalone`, `theme_color: #2563eb`, and adaptive SVG icons (`192x192`, `512x512`).
- **Install Experience**:
  - Non-intrusive `beforeinstallprompt` event interception offering a custom install button.
  - Contextual iOS Safari bookmark guidance (`"Add to Home Screen"`).
  - User dismissal state stored in `localStorage` to avoid repetitive prompts.

### 2. Service Worker Strategy (`public/sw.js`)
- **Cached Assets**:
  - Static app shell (`/`, `/manifest.json`, `/favicon.ico`, `/icons/*`).
  - Cache-first strategy for immutable build assets (`/_next/static/*`, images, fonts).
  - Network-first strategy with `/offline.html` fallback page for HTML navigations.
- **Strict Privacy Rule**:
  - Service worker **NEVER** caches `/api/*`, server action mutations, auth endpoints, customer credit, reports, employee salaries, or confidential messages.

### 3. Connection Detection & Offline UX
- **Network Status States**: `ONLINE`, `OFFLINE`, `RECONNECTING`.
- **Global UI Visibility**:
  - Top offline alert banner: *"You're offline. POS sales and cached catalog remain available and will sync automatically when connection returns."*
  - Reconnecting pulsing state.
  - Discreet navbar badge: `● Online`, `⚠ Offline`, or `↻ Syncing`.

### 4. POS Offline Mode & Local Cache
- **IndexedDB Database**: `dukaanos_offline_db`
  - `pos_catalog_cache`: Stores product catalog snapshots for offline search.
  - `sync_queue`: Holds queued offline transactions.
- **POS Stock Disclaimer**:
  - Clear banner displayed when offline: *"Stock shown is from your last synchronized inventory state."*
- **Offline Checkout**:
  - Generates a UUID `clientTransactionId` (`crypto.randomUUID()`).
  - Stores transaction in `sync_queue` with status `PENDING`.
  - Produces an offline receipt with reference `OFFLINE-PENDING`.

### 5. Server Idempotency & Financial Safety
- **Database Schema**: `Sale` includes `clientTransactionId String?` indexed with `businessId`.
- **Idempotency Guarantee**:
  - When an offline sale syncs, the server verifies whether `clientTransactionId` already exists.
  - If existing: returns the identical `Sale` record without duplicate line items, double payments, or extra stock deductions.
  - If new: commits the transaction atomically using PostgreSQL conditional stock decrements (`currentStock >= quantity`).
- **Stock Conflict Resolution**:
  - If inventory was depleted by another cashier while the device was offline, the server fails atomically with `INSUFFICIENT_STOCK`.
  - The client queue transitions the item to `CONFLICT` and displays:
    > *"This offline sale could not be completed because available stock changed while you were offline."*
  - The sale is **never** silently altered or converted to negative inventory.

### 6. Sync Center (`/dashboard/sync`)
- Real-time visibility into local queue:
  - Counts for Pending, Synced, Conflicts, and Failed items.
  - Device connection status and last sync time.
  - Manual "Sync Now" trigger.
  - Retry actions for failed items and "Clear Synced" history cleanup.

---

## Domain & Client Modules
- `public/manifest.json`: Web App Manifest.
- `public/sw.js`: Service worker.
- `src/lib/offline/db.ts`: IndexedDB wrapper.
- `src/lib/offline/sync-manager.ts`: Queue sync engine.
- `src/components/pwa/pwa-provider.tsx`: PWA context & offline banner.
- `src/components/sync/sync-center-view.tsx`: Sync Center UI.
- `src/app/dashboard/sync/page.tsx`: Sync Center page.
- `src/services/sales.ts`: Idempotent transaction execution.

---

## Verification
- Automated integration test suite: [`src/scripts/test_pwa_offline_sync.ts`](file:///d:/DukanOS/src/scripts/test_pwa_offline_sync.ts) (All tests passing).
- Production build: `npm run build` (All 32 Next.js routes compiled cleanly).
