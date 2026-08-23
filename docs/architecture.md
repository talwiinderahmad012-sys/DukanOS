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

## External Communication Integrations & Messaging Gateway (Step 15)
1. **Provider-Agnostic Gateway**:
   - Unified dispatcher (`sendCommunicationMessage`) with extensible adapters for `WhatsAppProvider`, `SmsProvider`, `EmailProvider`, and fallback `MockCommunicationProvider`.
2. **Free-First & Non-Blocking Isolation**:
   - Zero paid provider lock-in.
   - External delivery executes as an asynchronous side effect; delivery errors never fail or rollback committed sales or payments.
3. **Safe Message Templates & Interpolation**:
   - Reusable templates (`SALE_RECEIPT`, `PAYMENT_RECEIVED`, `CREDIT_REMINDER`, `FEEDBACK_REQUEST`, etc.).
   - Strict whitelist variable interpolation without dynamic `eval()`.
4. **Customer Consent & Preferences**:
   - `CustomerCommunicationPreference` enforces channel preferences and prohibits marketing dispatches without opt-in.
5. **Secret Protection & Audit Logging**:
   - Provider credentials stored in `encryptedSecrets` and masked from all client responses.
   - Comprehensive delivery history (`/dashboard/communications/history`) with manual retry capability and manual send interface (`/dashboard/communications/send`).

## Remote CCTV, Device Monitoring & Security Camera Foundation (Step 16)
1. **Zero Video Storage Principle**:
   - Connection coordinator and device status monitor rather than storing raw video.
2. **Media Gateway & RTSP Protocol Abstraction**:
   - Supports `IP_CAMERA`, `NVR`, `DVR`, `ONVIF`, `RTSP`, and `CLOUD_CAMERA`.
   - Browser playback compatibility via HLS/WebRTC streaming endpoints while clearly indicating media gateway requirements for raw RTSP streams.
3. **Strict Credential Protection & Secret Isolation**:
   - Passwords and auth tokens stored in `encryptedSecrets` and strictly sanitized from all client responses.
4. **Health Monitoring & Deduplicated Incident Alerts**:
   - Server-side connection testing and latency logging in `CameraHealthEvent`.
   - Offline transitions generate deduplicated notifications (`CAMERA_OFFLINE-${businessId}-${cameraId}`) to avoid alert fatigue.
5. **Remote Monitoring Cockpit Integration**:
   - Integrated into `/dashboard/monitoring` with live device counters, zone statuses, and quick feed view.

## System Settings, Business Configuration & Data Management (Step 17)
1. **Centralized Settings Hub (`/dashboard/settings`)**:
   - 4-quadrant organization: Store & Operations, Intelligence & Alerts, Team & Security, Data & System.
2. **Strongly-Typed Configuration (`BusinessSetting`)**:
   - Isolates configuration from core ledger schemas, preventing table bloat while preserving type safety.
3. **Financial Safety & Discount Enforcement**:
   - Role-based discount caps (`Cashier <= 5%`, `Manager <= 15%`, `Owner = Unlimited`) enforced on the server within sales transaction blocks.
   - Future-only invoice prefixing (`INV-`, `DUK-`) preserving historical snapshot immutability.
4. **Owner Protection Safeguards**:
   - Guaranteed minimum 1 active owner invariant; blocks accidental self-deletion or sole-owner demotion.
5. **Sanitized Data Export & System Diagnostics**:
   - Tenant-scoped JSON and CSV data exports strictly stripping credentials and tokens.
   - Real-time diagnostic monitors for PostgreSQL latency, auth, sync, push, gateway, and CCTV.

## Multi-Business, Multi-Branch & Context Management (Step 18)
1. **Server-Verified Active Context**:
   - Reads secure HTTP-only cookies (`dukaanos_active_business_id`, `dukaanos_active_branch_id`).
   - Strictly validates `BusinessMembership` and branch association on every request before binding context.
   - Automatically sanitizes and falls back if user is removed or switches between businesses.
2. **Global Business & Branch Switchers**:
   - Integrated into desktop sidebar and mobile header navigation drawer with instant 1-click switching.
3. **Business Management Hub (`/dashboard/settings/businesses`)**:
   - Atomic business creation (`Business`, `Branch`, `BusinessSetting`, `BusinessMembership`).
   - Business archive/restore rules blocking sales on inactive stores.
   - Transactional ownership transfer preserving minimum 1 active owner invariant.
4. **Multi-Branch Real-Time Overview & Filtered Reports**:
   - Real-time sales, order count, and profit breakdown across outlets on `/dashboard`.
   - Server-side branch filtering across daily, weekly, monthly, and yearly reports.

## Production Hardening, Security, Performance & Reliability (Step 19)
1. **Zero Client Trust Security Architecture**:
   - All operations derive business and branch context from authenticated session and database membership.
   - Cross-tenant leakage verified at 0% across all database entities.
2. **Sliding-Window In-Memory Rate Limiting**:
   - Protects authentication, registration, password updates, public feedback, and data exports.
3. **Structured Safe Logging & Correlation IDs**:
   - Automatically masks passwords, API tokens, session cookies, and RTSP credentials.
4. **Input Sanitization & Decimal Precision**:
   - Strips malicious HTML/scripts from user notes and feedback.
   - Prohibits floating-point rounding errors on POS and purchase transactions.
5. **Production HTTP Security Headers**:
   - Configured in `next.config.ts` (CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).

## Production Deployment, Release Engineering & Launch Readiness (Step 35)
1. **Production Deployment Architecture**:
    - Monolithic Next.js 16.3 App Router connected to PostgreSQL 16+ via `@prisma/adapter-pg` connection pool.
2. **Observability & Health Checks (`/api/health`)**:
    - Provides continuous database status and uptime telemetry for load balancers and orchestrators without leaking secrets.
3. **Automated Scheduled Maintenance (`/api/cron`)**:
    - Secured by `CRON_SECRET` bearer token; executes camera health polling and advisor findings evaluation.
4. **Production Bootstrap & Seed Safety**:
    - Hard guard blocking demo seeding in `NODE_ENV=production`. Dedicated `bootstrap_owner.ts` CLI script for clean tenant onboarding.
5. **Official Release v1.0.0**:
    - Full launch readiness verified with complete end-to-end retail smoke tests and zero-error production build.
6. **CI/CD & Release Management**:
    - Deterministic production build pipeline (`npm ci` → `prisma generate` → `prisma validate` → `tsc --noEmit` → `test` → `next build`).
    - GitHub Actions CI (`.github/workflows/ci.yml`) and CD (`.github/workflows/cd.yml`) workflows.
    - Initial Prisma migration (`prisma/migrations/001_init/`) for production database schema management.
    - Multi-stage Dockerfile for provider-agnostic containerized deployment.
    - Semantic versioning with git tags, `CHANGELOG.md`, and `RELEASE.md` release procedures.
    - See `AGENTS.md`, `docs/production.md`, `docs/deployment.md`, and `RELEASE.md`.

## Real-World Pilot, QA, UAT & Product Validation (Step 21)
1. **Controlled Retail Pilot ("Madina Karyana & General Store")**:
   - Real-world simulation across 40 realistic products, 10 wholesale suppliers, 15 customers, multi-tender sales, and debt recovery.
2. **Automated Multi-Ledger Mathematical Reconciliation**:
   - Stock Movement Ledger: $\sum \text{StockMovement.quantity} = \text{Product.currentStock}$ (100% verified).
   - Financial P&L: $\text{Gross Revenue} - \text{COGS} - \text{Expenses} = \text{Net Profit}$ with exact 2-decimal accuracy.
   - Udhaar Ledger: $\sum \text{Credit Sales} - \sum \text{Customer Payments} = \text{Customer.outstanding}$.
3. **Atomic Concurrency Protection**:
   - Conditional SQL row locks (`WHERE currentStock >= quantity`) prevent overselling in high-volume multi-cashier rush hours.
4. **Comprehensive Pilot User Documentation**:
   - `docs/pilot-feedback.md`, `docs/product-backlog.md`, and `docs/pilot-user-guide.md`.

## Public Launch, Landing Page, Product Positioning & User Onboarding (Step 22)
1. **Public Marketing & Trust Experience**:
   - Modern, responsive landing page (`/`) with Hero, Feature Matrix, Advisor Spotlight, Udhaar Spotlight, Remote/Offline Highlights, and Footer.
2. **Public Legal & Help Center**:
   - `/privacy`, `/terms`, `/support`, and comprehensive user documentation handbook at `/docs`.
3. **Interactive Setup Onboarding Checklist**:
   - Progressive milestone widget on `/dashboard` tracking business creation, catalog addition, customer setup, wholesale procurement, and first sale.
4. **In-App User Feedback & Bug Reporting**:
   - Floating dashboard modal enabling shop owners to submit satisfaction ratings and bug diagnostics.
5. **SEO & Structured Metadata**:
   - Next.js dynamic `robots.ts`, `sitemap.ts`, OpenGraph social cards, and `SoftwareApplication` JSON-LD structured data.

## Product Analytics, Feedback Intelligence & Continuous Improvement (Step 23)
1. **Privacy-First Usage Telemetry (`ProductAnalyticsEvent`)**:
   - Non-blocking ingestion engine with metadata sanitization stripping all financial balances, prices, salaries, and credentials.
2. **Activation Funnel & Product Health Score**:
   - Tracks 5-stage activation journey (Signup $\rightarrow$ Business $\rightarrow$ Product $\rightarrow$ Purchase $\rightarrow$ First Sale) with idempotent event recording.
   - Composite Health Score (0-100) based on Activation, Retention, Reliability, and Bug severity.
3. **Bug Triage & Feedback Management (`BugReport` & `ProductFeedback`)**:
   - Dedicated `/dashboard/product-insights` telemetry dashboard and `/dashboard/product-feedback` triage portal.
   - Complete bug lifecycle (`NEW` $\rightarrow$ `TRIAGED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`) and feature request status roadmap.

## SaaS Plans, Usage Limits, Feature Flags & Billing Foundation (Step 24)
1. **Free-First Commercial Architecture**:
   - Default `FREE` plan with all 17 standard core features enabled and unlimited resource quotas (`-1`).
   - Pure foundation layer without payment gateways, card capture, or artificial barriers.
2. **Data Model (`Plan`, `PlanFeature`, `PlanLimit`, `BusinessSubscription`, `BusinessEntitlement`)**:
   - Atomic automatic assignment of `BusinessSubscription` (`ACTIVE`) upon store registration.
   - Store-level entitlement overrides taking precedence over base tier definitions.
3. **Centralized Access & Usage Services**:
   - `canUseFeature(businessId, featureKey)` for server-authoritative feature gating.
   - `getBusinessUsage(businessId)` and `enforceLimit(businessId, limitKey)` for quota monitoring and domain error enforcement.
4. **Settings & Governance Portals**:
    - `/dashboard/settings/plan`, `/dashboard/settings/usage`, and platform governance portal at `/dashboard/platform/plans`.

## Production Reliability & Observability (Step 34)
- **Centralized Error Handling**: `src/lib/errors/` provides `AppError` with deterministic error codes (`UNAUTHORIZED`, `NOT_FOUND`, `INSUFFICIENT_STOCK`, etc.) and sanitized messages. Database internals are never exposed to clients.
- **Structured Logging**: `src/lib/logging/logger.ts` emits JSON logs with `timestamp`, `level`, `correlationId`, `category`, `businessId`, `userId`, and sanitized `metadata`. Sensitive keys (`password`, `token`, `secret`, `salary`, `cardNumber`) are automatically redacted.
- **Request Correlation**: Every API route and server action can attach a `correlationId` (from `X-Request-ID` header or generated UUID) for distributed tracing.
- **Health Checks**: `/api/health` (liveness) and `/api/health/ready` (readiness) endpoints for orchestration and monitoring.
- **Background Jobs**: `src/lib/jobs/job-runner.ts` provides idempotent, retryable job execution with failure tracking and structured logging.
- **Observability Dashboard**: `/dashboard/system` (owner-only) shows real-time operational metrics including application status, database latency, cache performance, and recent critical errors.
- **Offline/Sync Monitoring**: `src/lib/offline/sync-monitor.ts` tracks sync queue health, conflicts, and repeated failures.















