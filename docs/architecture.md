# DukaanOS Architecture

## Overview
DukaanOS is built on a monolithic Next.js App Router foundation, ensuring tight integration between the UI and the backend while maintaining strict tenant isolation.

## Folder Structure
- `/src/app`: Next.js pages and API routes (Route Handlers).
- `/src/components`: UI primitives and shared components.
- `/src/lib`: Core utilities (Prisma client, Auth config, common helpers).
- `/src/services`: The Data Access Layer. All business logic and database queries reside here.
- `/prisma`: Database schema definitions.

## Server / Client Boundaries
- **Server Components (Default)**: Used for data fetching, layouts, and rendering content that doesn't require interactivity. Database access happens here (via services).
- **Client Components**: Marked with `'use client'`. Strictly used for interactive UI elements (forms, POS cart, charts).
- **Server Actions**: Used for mutations (creating a sale, updating inventory).

## Database Layer
PostgreSQL with Prisma ORM. 
The client is instantiated in `src/lib/db/prisma.ts` as a singleton to avoid connection exhaustion during development.
All data-mutating entities enforce a `businessId` foreign key for multi-tenant isolation.
*See `docs/database.md` for a detailed breakdown of the Stock, Profit, and Money representation strategies.*

## Backend Service Flow (Step 4)
The backend enforces a strict data flow to ensure safety and tenant isolation:
1. **Server Actions (`src/app/actions`)**: Accepts data from the UI.
2. **Input Validation (`src/lib/validations`)**: Zod parsing validates the raw payload.
3. **Authentication (`src/lib/auth/context.ts`)**: `requireBusinessAccess` confirms the user exists and holds a valid `BusinessMembership`.
4. **Service Layer (`src/services`)**: Business logic is executed.
5. **Prisma Transaction (`src/services/sales.ts`)**: Critical mutations (like POS checkouts which update stock and customer ledgers) are wrapped in `prisma.$transaction()` to guarantee atomicity. If any step fails, everything rolls back.

## Authentication Layer
Using Auth.js (NextAuth) mapped in `src/lib/auth/auth.ts`. Session data dictates access rights and business association.

## Authentication & Onboarding Flow (Step 5)
1. **Credentials Auth**: Users register via the egisterUserAction (passwords hashed with cryptjs) and sign in using the Auth.js CredentialsProvider.
1. **Credentials Auth**: Users register via the egisterUserAction (passwords hashed with  cryptjs) and sign in using the Auth.js CredentialsProvider.
2. **Onboarding Routing**: After login, the dashboard/layout.tsx Server Component verifies BusinessMembership. If the user has no business, they are forcefully redirected to /onboarding.
3. **Atomic Business Creation**: The /onboarding step calls createBusinessForUser(), which atomically creates the Business, the Branch, and the BusinessMembership (OWNER) in a single transaction.
4. **App Shell**: The main application interface resides under /dashboard, utilizing a responsive mobile/desktop Layout component that reads the user's active business context.


## Products, Inventory & Catalog Flow (Step 6)
1. **Catalog**: Products, Categories, and Suppliers are logically bounded by `businessId`.
2. **Products**: Products map 1:1 to their Business. They can be optionally linked to a Category.
3. **Inventory Adjustments**: Adjustments hit the `adjustStockAction`, which writes to `StockMovement` and atomically updates `currentStock` on the `Product` inside a Prisma transaction. Negative stock is strictly blocked at the application level.
4. **Profit Tracking**: Displayed at the view layer natively by querying `sellingPrice` - `purchasePrice`.

## Purchases & Supplier Transactions (Step 7)
1. **Purchase Creation**:
   - Atomically wrapped in `prisma.$transaction`.
   - Records immutable unit cost on `PurchaseItem.purchasePrice`.
   - Updates `Product.purchasePrice` (catalog latest cost) and increments `Product.currentStock`.
   - Writes `StockMovement` ledger entry with `MovementType.PURCHASE` and references the purchase invoice.
   - Emits an `AuditLog` entry for financial traceability.
2. **Safe Atomic Cancellation**:
   - **Stock Protection**: Prior to cancellation, checks `product.currentStock >= item.quantity` for all items. If consumed (sold/adjusted), the operation is blocked with a domain error.
   - **Cost Rollback**: Automatically recalculates `Product.purchasePrice` from the latest remaining valid (`RECEIVED`) purchase.
   - **Ledger Offset**: Emits offsetting `StockMovement` entries (`MovementType.RETURN`, negative quantity) and marks the purchase as `CANCELLED`.
3. **Supplier Ledger & History**:
   - Dedicated vendor profile at `/dashboard/suppliers/[id]` with real-time spend analytics, invoice counts, and itemized transaction history.

## Sales, POS Terminal, Customer Credit & Invoices (Step 8)
1. **POS Terminal (`/dashboard/pos`)**:
   - High-speed cashier interface supporting instant keyboard & USB barcode scanning (`scan -> find -> add/increment`).
   - Real-time client & authoritative server stock verification.
   - Interactive line items with quantity adjustments, unit price overrides, line discounts, and profit previews.
   - Inline quick customer creation modal without navigating away from the cashier terminal.
   - Multiple payment methods (`CASH`, `CARD`, `MOBILE_WALLET`, `CREDIT`, `BANK_TRANSFER`).
2. **Concurrency-Safe Stock Decrement**:
   - Implemented via an atomic conditional SQL query inside `prisma.$transaction`:
     `UPDATE "Product" SET "currentStock" = "currentStock" - $qty WHERE "id" = $id AND "currentStock" >= $qty RETURNING "id", "currentStock", ...`
   - If 0 rows are affected (insufficient stock at commit time), the transaction immediately rolls back with `INSUFFICIENT_STOCK`. Stock never becomes negative under concurrent sales.
3. **Proportional Global Discount Allocation & Realized Profit**:
   - Line-level discounts apply directly to items.
   - Any global/sale-level discount is proportionally allocated across line items (`share = (lineTotal / subtotal) * globalDiscount`).
   - `SaleItem.lineProfit` stores immutable, actual realized profit after all discounts for accurate reporting.
4. **Customer Credit (Udhaar) & Payments**:
   - Credit sales strictly require an identified customer; anonymous credit is rejected.
   - Fully-paid upfront sales do not create misleading debt/payment records.
   - Partial/credit sales increment `Customer.outstanding` only for the unpaid balance (`total - paidAmount`).
   - `CustomerPayment` records subsequent debt payments made against existing customer outstanding balances.
   - Unified chronological running ledger at `/dashboard/customers/[id]` calculating running balances across credit sales, payments, and cancellations.
5. **Printable Invoices (`/dashboard/sales/[id]`)**:
   - Clean thermal/A4 paper-ready print view using `@media print` CSS (sidebar/actions disappear automatically when printing).
6. **Safe Sale Cancellation**:
   - Atomic rollback restores product stock, creates reverse `StockMovement` records (`MovementType.RETURN`), reverses unpaid credit from `Customer.outstanding`, marks the sale as `CANCELLED`, and logs an `AuditLog` without phantom cash refunds.

## Reports, Analytics, Growth & Business Advisor (Step 9)
1. **Centralized Reporting Engine (`src/services/reports/`)**:
   - Daily, Weekly, Monthly, and Yearly reports aggregated directly from transactional models (`Sale`, `SaleItem`, `Expense`, `Purchase`, `CustomerPayment`).
   - Cancelled transactions strictly excluded from all active revenue, profit, and volume metrics.
   - Centralized timezone-aware date range generation (`src/lib/utils/date-utils.ts`).
2. **Growth Engine (`src/services/reports/` & `/dashboard/growth`)**:
   - Day-over-Day, Month-over-Month, and Year-over-Year growth calculations with safe zero-baseline handling (`NO_BASELINE`, no `NaN`/`Infinity`).
3. **Deterministic Business Advisor (`src/services/advisor/` & `/dashboard/advisor`)**:
   - Rule engine evaluating `OUT_OF_STOCK`, `LOW_STOCK`, `SLOW_MOVING`, `HIGH_DEMAND`, `SALES_DECLINE`, `PROFIT_DECLINE`, `CREDIT_RISK`, and `EXPENSE_SPIKE`.
   - Composite Business Health Score (0–100) based on 5 weighted pillars (Sales Momentum, Margin Health, Inventory Availability, Credit Risk, Expense Discipline).
4. **Owner Notification Deduplication**:
   - Critical findings emit owner notifications with deterministic deduplication keys (`${businessId}-${type}-${relatedEntityId}-${periodKey}`) to prevent alert spam.

## Employee & Staff Management (Step 10)
1. **Staff Directory & Profiles (`/dashboard/employees`)**:
   - Business-scoped employee records separated from user login accounts (`Employee` model).
   - Auto-generated business-unique codes (`EMP-001`, `EMP-002`) via `generateNextEmployeeCode`.
2. **Attendance System (`src/services/attendance.ts`)**:
   - Strictly 1 attendance record per employee per day (`@@unique([businessId, employeeId, date])`).
   - Same-day upserts with check-in, check-out, and late/absent statuses.
3. **Leave Management (`src/services/leave.ts`)**:
   - Multi-day leave requests (`CASUAL`, `SICK`, `ANNUAL`, `UNPAID`, `OTHER`).
   - Manager review & approval workflow with owner notifications and audit logs.
4. **Deterministic Payroll & Disbursement (`src/services/salaries.ts`)**:
   - Net salary formula: $\text{Base} + \text{Overtime} + \text{Bonus} - \text{Deductions} - \text{Advance}$.
   - Immutable monthly records (`YYYY-MM`) with disbursement status and payment channels.
5. **Workplace Complaints & Privacy (`src/services/complaints.ts`)**:
   - Confidential grievance filing with urgent priority triggers.
   - Strict role privacy ensuring ordinary staff cannot view peer complaints.

## Customer Experience, Feedback & Loyalty Foundation (Step 11)
1. **Customer Insights & 5-Tab Profile Hub (`/dashboard/customers/[id]`)**:
   - Factual customer intelligence computed strictly from completed sales (Lifetime Spend, AOV, Purchase Frequency, Top 5 Favorite Products, Customer Rating).
   - Unified ledger preservation (Khata debt/credit running balance).
   - Customer status lifecycle (`ACTIVE`, `INACTIVE`, `ARCHIVED`).
2. **Public Mobile Feedback System (`/feedback/[token]`)**:
   - Secure 32-character single-use invite tokens.
   - Non-authenticated public submission without leaking internal financial balances.
   - 1 to 5 star integer ratings across 7 categories.
   - Anonymous review submission support.
3. **Feedback Management Dashboard (`/dashboard/feedback`)**:
   - Aggregate KPIs: Average Rating, Positive (4-5★), Neutral (3★), Negative (1-2★), and Category Breakdowns.
   - Status transitions (`NEW`, `REVIEWING`, `RESOLVED`, `ARCHIVED`) and private manager resolution notes.
4. **Low-Rating Owner Alerts**:
   - Negative reviews ($\le 2$ stars) trigger deduplicated `Notification` alerts (`${businessId}-FEEDBACK-${id}`) for store management.

## Internal Communication, Activity Center & Remote Management (Step 12)
1. **Internal Direct Messaging (`/dashboard/communications`)**:
   - Multi-tenant business-scoped conversations and message dispatching.
   - Single-use conversation creation with participant join timestamps and dynamic unread tracking (`Message.createdAt > ConversationParticipant.lastReadAt`).
   - In-app notification creation on message arrival.
2. **Store Announcements & Broadcasts (`/dashboard/communications`)**:
   - Owner/Manager published broadcasts with priorities (`NORMAL`, `IMPORTANT`, `URGENT`) and role targeting (`ALL`, `OWNER`, `MANAGER`, `CASHIER`, `EMPLOYEE`).
   - Read acknowledgment tracking via `AnnouncementRead`.
3. **Centralized Activity Center (`/dashboard/activity`)**:
   - Unified chronological feed across sales, inventory, staff, customer, and administrative events.
   - Role-based privacy filters: hides confidential payroll records and complaints from ordinary staff.
4. **Remote Business Status & Monitoring Cockpit (`/dashboard/monitoring`)**:
   - Live store status toggle (`isOpen`, `operatingHours`).
   - Real-time today's sales and gross profit analytics.
   - Staff attendance breakdown (Present, Late, Absent, Leave).
   - Owner Action Center surfacing low stock, overdue receivables, pending leaves, open grievances, and low customer ratings.

## PWA, Offline Mode & Synchronization Foundation (Step 13)
1. **PWA App Shell & Manifest**:
   - `public/manifest.json` for desktop and mobile installation.
   - Custom non-intrusive install prompt banner and iOS Safari home screen bookmark helper.
2. **Service Worker (`public/sw.js`)**:
   - Pre-caches core app shell and provides cache-first static asset delivery.
   - Strictly excludes dynamic private API routes, server action mutations, and sensitive financial endpoints.
3. **IndexedDB Local Storage (`src/lib/offline/db.ts`)**:
   - `pos_catalog_cache`: Cached snapshot of active products for offline barcode/name searching.
   - `sync_queue`: Local transaction queue storing UUID client-tagged offline sales.
4. **Idempotency & Server Authority**:
   - Every offline sale attaches a `clientTransactionId` UUID.
   - Sync retries return the committed sale idempotently without duplicating stock decrements or revenue.
   - Stale offline sales that exceed remaining stock are safely rejected with `INSUFFICIENT_STOCK` and marked as `CONFLICT` on the client.
5. **Sync Center (`/dashboard/sync`)**:
   - Operational cockpit displaying device connection state, queue status (Pending, Synced, Conflict, Failed), manual sync triggers, and retry tools.

## Advanced Notifications, Web Push & Owner Daily Digest (Step 14)
1. **Multi-Channel Notification Architecture**:
   - In-app notification center (`/dashboard/notifications`) with severity filters, pagination, and direct action routing.
   - Interactive top-bar notification bell dropdown with real-time unread counts and quick acknowledgement.
2. **Standards-Based Web Push**:
   - W3C Push API with VAPID signing (`web-push`) and multi-device subscription storage (`PushSubscription`).
   - Clean permission consent flow and automatic dead endpoint cleanup (`410 Gone` / `404 Not Found`).
   - Lock-screen privacy: push notifications omit sensitive financial numbers from device lock screens.
3. **Deduplication Engine**:
   - Deterministic deduplication keys (`${type}-${businessId}-${relatedEntityId}-${periodKey}`) prevent alert fatigue.
4. **Timezone-Aware Owner Daily Digest**:
   - Computes yesterday's sales, gross profit, order count, and growth against previous day using `Business.timezone`.
   - Guaranteed idempotency (`DAILY_DIGEST-${businessId}-${yesterdayDateStr}`) prevents duplicate digest broadcasts.
5. **Granular Notification Preferences (`/dashboard/settings/notifications`)**:
   - User-level toggles for alert categories and Web Push with strict role-based access restrictions.




