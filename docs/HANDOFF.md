# DukaanOS Developer Handoff & Runbook (Phase 1, Step 38)

## Overview
This document represents the definitive developer handoff and disaster-recovery runbook for DukaanOS. It is intended for both human developers and future AI agents to ensure safe, stable maintenance of the production system.

---

## 1. Project Architecture Documentation
DukaanOS is built as a monolithic Next.js application using the App Router, providing tight integration between frontend and backend while maintaining strict tenant isolation.

- **Next.js App Router**: Provides server-side rendering, routing, and API endpoints (Server Actions).
- **Authentication**: Powered by Auth.js (NextAuth) mapped in `src/lib/auth/auth.ts`. Session data dictates access rights and business association.
- **Prisma & PostgreSQL**: Data access layer managed via Prisma ORM connected to a PostgreSQL database. Singleton client ensures connection pool stability.
- **Multi-Tenancy**: All data-mutating entities enforce a `businessId` foreign key. Server actions strictly isolate queries by the active user's `businessId`.
- **RBAC**: Handled natively within the `BusinessMembership` entity, granting roles like OWNER, MANAGER, CASHIER.
- **Server Actions/Services**: The Data Access Layer in `src/services` handles business logic. All mutations happen here, securely wrapping Prisma calls inside `$transaction()` for atomicity.
- **Financial Transaction Flow**: Stock, purchasing, and sales rely on atomic double-entry-style stock movements and strict real-time validations.
- **PWA/Offline Architecture**: Supported via `public/sw.js` and `next-pwa` configuration. Handles caching but defers transactional mutations to the server.
- **Communications / Notifications**: Integrated email and web push endpoints via centralized providers, deduplicated securely.
- **Employee/Payroll**: Tracks attendance, complaints, leave, and calculates salary advances/deductions within a robust schema structure.
- **Analytics / Advisor**: Growth engine computes daily, weekly, monthly trends. A deterministic business advisor scores health based on stock and sales metrics.
- **Audit Logging**: `AuditLog` tracks every financial and operational change, linked directly to the actor and business.

---

## 2. Database Architecture
The schema is defined in `prisma/schema.prisma` and strictly enforces tenant/business boundaries via the `businessId` foreign key on all core entities.

### Core Entities:
- **User & Account**: Global authentication scopes.
- **Business**: The root tenant. All operational data depends on this entity.
- **Branch**: Optional sub-locations for a business.
- **Category, Product, Supplier**: Catalog and inventory primitives.
- **StockMovement**: The immutable ledger for inventory changes.
- **Customer, Sale, SaleItem, CustomerPayment**: The financial ledger for sales and Udhaar (credit).
- **Purchase, PurchaseItem, Expense**: Outbound financial flow.
- **Employee, EmployeeAttendance, EmployeeSalary**: Staff and payroll.
- **AuditLog**: Immutable action tracker.

### Tenant Scoping:
Every business-owned query MUST remain tenant-scoped. Under no circumstances should a global query without `where: { businessId }` be executed on business-owned tables.

---

## 3. Authentication Documentation
The application uses NextAuth (Auth.js) with the Credentials Provider.

### Authentication Flow:
1. **Login**: User inputs credentials.
2. **Credentials Verification**: Server hashes the password with bcryptjs and checks the User record.
3. **Session**: A secure JWT/session token is granted.
4. **Protected Route**: Middleware and `requireBusinessAccess` check the session.
5. **Dashboard**: User is routed to their active business context.

### Safe Error Behavior:
- **Wrong Credentials**: Generic "Invalid email or password" error. Never reveals if the email exists.
- **Database Unavailable**: A generic service error is thrown without exposing the Prisma connection string.
- **Unexpected Server Failure**: Logs redacts sensitive information and displays a safe generic error to the user.

**NEVER document or expose:** passwords, hashes, `AUTH_SECRET`, `DATABASE_URL`, or any production credentials.

---

## 4. RBAC Documentation
Roles are defined in the `MembershipRole` enum.

- **OWNER**: Full access to all operations, business settings, branch management, employee management, and destructive operations (like cancellation).
- **MANAGER**: Operational oversight. Can manage inventory, process sales, and view reports, but cannot alter business-level settings or perform destructive system changes.
- **CASHIER**: Strictly limited to POS operations (creating sales, adding customers) and viewing basic stock levels. Cannot edit products, view high-level analytics, or cancel sales.

**Server-Side Enforcement**: UI visibility (hiding buttons) is NOT authorization. Server Actions explicitly verify the role via `requireBusinessAccess(Role[])` before executing any Prisma transaction.

---

## 5. Financial Data Flow
### SALE (POS)
1. Cashier triggers sale checkout.
2. Server validates payload, Udhaar limits, and exact stock availability.
3. **Atomic Transaction**:
   - Reduces `Product.currentStock`.
   - Records `Sale` and `SaleItem`s.
   - Saves immutable `lineProfit` snapshots.
   - If credit, updates `Customer.outstanding`.
4. Invoice generated and returned.

### PURCHASE (Inbound Stock)
1. Manager submits purchase invoice.
2. Server validates.
3. **Atomic Transaction**:
   - Increases `Product.currentStock`.
   - Updates `Product.purchasePrice` (latest cost).
   - Generates `StockMovement` (PURCHASE).
   - Creates `Purchase` record.

### CANCELLATION (Reversal)
1. Authorized user cancels sale/purchase.
2. **Atomic Reversal**:
   - Stock is returned (re-incremented or decremented).
   - `StockMovement` (RETURN) is created.
   - Customer Udhaar (if any) is reversed.
   - The original record is marked `CANCELLED`.
   - `AuditLog` captures the exact cancellation event.

---

## 6. Udhaar (Credit) Documentation
DukaanOS handles customer debt via a running ledger.

- **Credit Sale**: When a sale is marked as CREDIT or partially paid, the unpaid amount automatically increments `Customer.outstanding`.
- **Payment**: Customers making debt payments are recorded via `CustomerPayment`, which decrements `Customer.outstanding`.
- **Cancellation**: Cancelling a credit sale automatically deducts the unpaid portion of that specific sale from the customer's outstanding balance, preventing phantom debt.
- **Note**: There is no independent "balance calculation" script. The `outstanding` field is the single source of truth, mutated exclusively via atomic Prisma transactions during Sales, Payments, and Cancellations.

---

## 7. Offline / PWA Documentation
DukaanOS is configured as a Progressive Web App (PWA).

- **Installation**: `next-pwa` generates the service worker (`public/sw.js`) and parses the manifest.
- **Offline Capabilities**: Caches static assets, layout shells, and fonts.
- **POS Offline Queue**: While the UI remains partially functional offline, financial mutations (sales) require an active connection. The system is designed for high-availability connections; complete offline POS synchronization with a local DB is NOT currently implemented to prevent split-brain inventory corruption.
- **Reconnect Behavior**: The app automatically refetches active data via SWR/React Cache upon regaining connectivity.

---

## 8. Urdu Typography Documentation
DukaanOS supports bilingual English and Urdu interfaces.

- **English**: Uses standard web-safe sans-serif typography.
- **Urdu**: Exclusively uses the **Jameel Noori Nastaleeq** font for authenticity and readability.
- **Implementation**: The language context dictates the `dir="rtl"` layout. Urdu inputs, placeholders, and database fields seamlessly support UTF-8. No page-specific font rules are allowed; the Nastaleeq font is globally enforced when the Urdu locale is active.

---

## 9. Environment Documentation
The application relies on several environment variables. Use this as a reference (NAMES ONLY).

- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: NextAuth encryption secret.
- `APP_URL`: The canonical URL of the application.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Web push notification keys.
- `RESEND_API_KEY`: Email provider key.
- `CRON_SECRET`: Secret for authenticating scheduled background jobs.

---

## 10. Development Setup
To set up DukaanOS locally:

1. Ensure Node.js `>=20.18.0` is installed.
2. Install dependencies using exactly `npm ci` (respects `package-lock.json`).
3. Copy `.env.example` to `.env` and fill in the required variables (e.g., local PostgreSQL URL).
4. Start PostgreSQL locally (e.g., via Docker).
5. Verify database connectivity.
6. Apply migrations: `npx prisma migrate dev`
7. Generate Prisma client: `npx prisma generate`
8. Validate schema: `npx prisma validate`
9. Start development server: `npm run dev`
10. Open `http://localhost:3000` and register a new business owner.

---

## 11. Production Deployment
Deployment must be handled with strict CI/CD discipline.

1. **Environment Setup**: Provision Node.js environment and secure PostgreSQL database. Set all `.env` variables securely in the host.
2. **Build**: Run `npm ci`, `npx prisma generate`, and `npm run build`.
3. **Migration Safety**: Run `npx prisma migrate deploy` (NEVER `dev` or `reset` in production).
4. **Startup**: Run `npm start`.
5. **Health Verification**: Check the logs for successful Prisma pool initialization.
6. **Authentication Smoke Test**: Attempt to log in with a test account to verify the session store and database connection.

---

## 12. Database Backup Runbook
**Operational Requirement**: As there is no automated backup script tracked in this repository, PostgreSQL automated backups MUST be configured at the infrastructure level (e.g., AWS RDS Automated Backups, pgBackRest, or daily `pg_dump` cron jobs dumped to an S3 bucket).
- Backups must be tested monthly.
- Point-in-time recovery (PITR) should be enabled for financial data safety.

---

## 13. Disaster Recovery Runbook
### DATABASE DOWN
1. Check PostgreSQL service/container status.
2. Verify network connectivity between the app and the database.
3. Check `DATABASE_URL` for accidental changes or expiring credentials.
4. Inspect PostgreSQL logs for OOM (Out of Memory) or connection limit errors.
5. Restore service/restart database.
6. Verify Prisma connectivity via the application logs.
7. Run health check and test login, dashboard, and a POS workflow.

### APPLICATION DOWN
1. Inspect application logs (`pm2 logs` or Docker logs).
2. Check environment configuration (`AUTH_SECRET`, etc.).
3. Verify database connectivity.
4. Verify the integrity of the Next.js build (`.next` folder).
5. Restart the application.
6. Test authentication.

### BAD DEPLOYMENT
1. Stop any further rollouts.
2. **Preserve the database** (do not roll back migrations unless strictly necessary and perfectly understood).
3. Inspect the failing release logs.
4. Roll back the application container/deployment to the previous known-good version.
5. Verify database compatibility with the older code.
6. Run smoke tests.

**CRITICAL: Never reset or destroy the database as a first recovery action.**

---

## 14. Incident Response
**General Rule**: DO NOT immediately modify database data.
1. Reproduce the issue.
2. Inspect application and database logs.
3. Identify the root cause.
4. Check recent code/deployment changes.
5. Preserve data.
6. Fix the smallest verified cause in code.
7. Run regression tests before deploying the fix.

- **Login Fails**: Check `AUTH_SECRET` consistency and database connectivity.
- **Sales Fail / Stock Incorrect**: Check Prisma transaction timeout limits and `StockMovement` logs.
- **Udhaar Incorrect**: Trace `CustomerPayment` and `Sale` records for the specific customer. Do not manually update `outstanding`.
- **PWA Sync Fails**: Instruct the user to refresh the page while connected to a stable network.

---

## 15. Maintenance Rules
### NEVER
- Run `prisma migrate reset` on real data.
- Drop the production database.
- Delete database volumes or PostgreSQL data directories.
- Reset user passwords directly in the database without authorization.
- Manually edit financial records (`Sale`, `Purchase`, `StockMovement`, `Customer`).
- Bypass tenant isolation (`businessId` filters).
- Bypass RBAC (`requireBusinessAccess`).
- Expose secrets in logs or code.
- Disable authentication to "test faster".
- Change a working UI unnecessarily.

### ALWAYS
- Inspect the current implementation first.
- Make the smallest possible changes.
- Run TypeScript validation (`npx tsc --noEmit`).
- Run Prisma validation (`npx prisma validate`).
- Run relevant tests.
- Run the build (`npm run build`).
- Verify affected workflows manually.
- Review data safety and atomicity.

---

## 16. AI / Developer Safety Rules
The project MUST be treated as an existing production system. AI agents and future developers must adhere to the following workflow:

1. **Inspect**: Read existing implementation and architecture documentation first.
2. **Identify Dependencies**: Trace how the requested change affects the DB schema and UI.
3. **Check Existence**: Determine whether the functionality already exists.
4. **Preserve Behavior**: Do not rewrite existing business calculations.
5. **Minimal Impact**: Make the smallest possible change to fulfill the requirement.
6. **Test**: Validate via `tsc`, `prisma validate`, and `npm test`.
7. **Report**: Document the exact files changed.

**AI/Developers MUST NOT**:
- Delete working modules.
- Replace the architecture unnecessarily.
- Redesign completed pages.
- Rewrite business calculations (like Udhaar or Profit).
- Reset databases or fabricate test results.
- Claim PASS without verifying.

---

## 17. Change Management Workflow
Follow this safe workflow for all updates:
**Inspect** → **Plan** → **Implement** → **TypeScript Check** → **Prisma Validation** → **Tests** → **Build** → **Smoke Test** → **Review Diff** → **Release**

No unnecessary rewrites. All changes must be atomic and reversible.

---
*End of Document*
