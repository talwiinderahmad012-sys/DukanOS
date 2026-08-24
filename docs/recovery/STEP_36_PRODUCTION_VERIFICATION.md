# DukaanOS — Step 36: Production Readiness Verification & Regression Hardening

**Date:** 2026-08-23
**Verifier:** Production-readiness audit (read-only audit → tests → minimal fixes)
**Scope:** Full system end-to-end verification against the REAL PostgreSQL database. No destructive operations were performed (no `migrate reset`, `DROP`, `TRUNCATE`, or `DELETE`). Test fixtures were *added* by verification scripts only; no existing records were mutated or removed.

---

## 1. Overall Production Readiness

**READY WITH WARNINGS**

- Build, typecheck, schema validation, and the entire core retail workflow verified against real data.
- All 26 reliability tests, all 25 security tests, the production smoke test, and the reconciliation suite pass against the live database.
- Real data confirmed intact across every major model (see §4).
- 5 high-severity RBAC / tenant-integrity regressions were **confirmed and fixed** (see §9).
- Remaining warnings are non-blocking (see §13): in-memory rate limiter reset on restart, disabled external (WhatsApp/SMS) provider processor by prior design, minor analytics timezone handling, and a known sidebar/active-business display inconsistency.

---

## 2. Step 1–35 Regression Matrix

Status legend: PASS / PARTIAL / BROKEN / MISSING / DATA-NOT-VISIBLE / DISCONNECTED / NOT-VERIFIED

| Step | Module | Status | Evidence |
|------|--------|--------|----------|
| 1 | Auth & Multi-tenant (register/login/RBAC) | PASS | `auth.ts` read-only `authorize`; `getActiveBusiness.ts` cookie-validated membership; no duplicate creation |
| 2 | Business Profile & Branches | PASS | 231 businesses, 177 branches present; branch switch validates membership |
| 3 | Catalog (Products/Categories/SKUs) | PASS | 217 products, 12 categories present and queryable |
| 4 | Suppliers & Purchases | PASS | 50 suppliers, 62 purchases, 104 purchase items; stock increment verified |
| 5 | POS & Sales (Udhaar/Profit) | PASS | 251 sales, 315 sale items; idempotent `clientTransactionId` confirmed |
| 6 | Customers & Udhaar Ledger | PASS | 114 customers; ledger reconciled to 0 in smoke + reconciliation tests |
| 7 | Reporting Center | PARTIAL | Reports render; branch filtering not exposed for daily/weekly/monthly/yearly (B3) |
| 8 | Advanced Analytics & Dashboard | PASS | Aggregates exclude CANCELLED; business-scoped; Decimal-safe |
| 9 | Inventory Mgmt (Stock adj / low stock) | PASS | 366 stock movements; non-negative enforcement verified |
| 10 | Employees Foundation | PARTIAL | CRUD fine; `getEmployeeAction` exposed HR data to any member — **FIXED (BUG 1)** |
| 11 | Payroll Foundation | PASS | 13 payroll records; paid-immutability verified |
| 12 | Settings Hub | PARTIAL | Tightly RBAC-gated (OWNER-only); role matrix drift noted |
| 13 | PWA & Offline Support | PASS | Sync manager/idempotency verified in prior suites |
| 14 | Security (Rate limit/CSP) | PARTIAL | Login throttle unused — **FIXED (C1)**; cron query-secret leak — **FIXED (C9)**; weak CSP noted |
| 15 | Observability (Audit Logs) | PASS | 874 audit records; mutation tracking active |
| 16–23 | Refinements | PASS | Performance/optimization modules present |
| 24 | Internal Communications | PARTIAL | In-app/announcements/digest work; external provider processor intentionally reverted (Step 28) |
| 25 | Growth & Advanced Reports | PASS | Advisor health score computed (88/100 in smoke test) |
| 26 | Settings additions | PASS | Sales/invoice settings UI active |
| 27 | Advanced HR (Attendance/Leaves) | PASS | Leave state machine + LeaveBalance atomic;27 attendance records |
| 28 | External Communications | REVERTED (BY DESIGN) | Reverted to avoid 3rd-party cost dependency; in-app path retained |
| 29 | Customer Feedback (Reviews/Complaints) | PASS | Feedback hub renders; types/status/priority/notes work |
| 30 | Product Insights & Triaging | PARTIAL | `triageBugReportAction`/`triageFeatureRequestAction` lacked role guard — **FIXED (A1/A2)** |
| 31 | System Health & Remote Monitoring | PASS | `/dashboard/system`, `/dashboard/monitoring` active |
| 32 | Subscription Plans | PASS | 38 subscriptions; platform plans active |
| 33 | Security hardening | PASS | 25/25 security tests pass; minor gaps noted |
| 34 | Reliability/DR | PASS | 26/26 reliability tests pass |
| 35 | Deployment infrastructure | PASS | Docker/compose/CI/CD/cron present; build green |

---

## 3. Critical Workflow Result

**Product → Purchase → Stock → POS → Sale → Profit → Udhaar → Payment → Analytics → Reports**

Verified via `test_production_smoke.ts` + `test_reconciliation.ts` against the live database:

1. **Bootstrap**: Business + Branch created atomically via `onboarding` service. ✓
2. **Product**: Catalog item with SKU + selling/purchase price. ✓
3. **Purchase**: Stock received → `currentStock` incremented; `StockMovement` PURCHASE recorded. ✓
4. **POS Sale**: Cash sale created → stock deducted (50 → 45), `StockMovement` SALE recorded, `lineProfit` captured. ✓
5. **Profit Snapshot**: Financial summary verified — Sales Revenue Rs. 10,500, Realized Profit Rs. 2,100 — matching `SaleItem.lineProfit` sums. ✓
6. **Udhaar**: Partial credit sale + payment reconciled outstanding to exactly 0. ✓
7. **Customer Ledger**: Credit Given (3000) − Payments (1500) = Balance (1500) verified. ✓
8. **Analytics**: KPIs/business-scoped; CANCELLED sales/purchases excluded. ✓
9. **Reports**: Report center renders; printable report + exports present. ✓
10. **Advisor**: Health score 88/100 computed. ✓
11. **Audit**: 7 immutable security events recorded for the session. ✓
12. **Concurrency**: Atomic row lock prevented over-sale (stock never negative). ✓

---

## 4. Real Database Data Verification

Read-only `COUNT` queries against the production/local `dukaanos` database returned:

| Model | Count | Model | Count |
|-------|-------|-------|-------|
| User | 336 | Employee | 37 |
| Business | 231 | EmployeeAttendance | 27 |
| BusinessMembership | 321 | EmployeeSalary | 16 |
| Branch | 177 | Payroll | 13 |
| Product | 217 | Feedback | 14 |
| Category | 12 | ProductFeedback | 14 |
| Supplier | 50 | StockMovement | 366 |
| Customer | 114 | AuditLog | 874 |
| Sale | 251 | Plan | 1 |
| SaleItem | 315 | BusinessSubscription | 38 |
| Purchase | 62 | | |
| PurchaseItem | 104 | | |

**Tenant isolation**: Every service query is scoped by `businessId` (and `branchId` where relevant — verified in sales, purchases, customers, products, employees, salaries, reports). Cross-tenant access rejected by tests (Step 33 Test 3–6, 21, 23, 24).

**Data visibility**: Records exist and are returned by the same business-scoped queries the UI uses (verified via `getActiveBusiness()` cookie-aware context). No empty-UI-with-present-data anomaly found in the audited paths.

---

## 5. Authentication / Business-Context Verification

- **Login**: `authorize()` in `src/lib/auth/auth.ts` **only reads** (`prisma.user.findUnique` + bcrypt compare). It never writes → **no duplicate user/business/membership** can be created on login.
- **Registration/Onboarding**: User + Business + Branch + OWNER Membership + Settings + Subscription + AuditLog created atomically inside a `$transaction` (`src/services/business/context.ts`, `src/services/onboarding.ts`). Idempotent per email (duplicate-email rejected).
- **Session**: JWT strategy; `session.user.id = token.sub`.
- **Active business**: `getActiveBusiness()` reads the `dukaanos_active_business_id` cookie and **validates it against the user's own memberships** before use (`src/lib/auth/getActiveBusiness.ts:21-24`). `switchActiveBranchAction` validates branch ∈ active business.
- **Membership/role/branch**: surfaced via `requireBusinessAccess(businessId, allowedRoles)` and `getActiveBusiness().membership`.
- **No secret leakage**: passwords are bcrypt-hashed (`test_step33_security.ts` Test 20); camera secrets redacted in API output; logs redact password/token/RTSP/salary.

---

## 6. Security Verification

- **RBAC**: 21 server-action files audited. Role enforcement is present on the vast majority. Confirmed regressions fixed: product-feedback triage (A1/A2), feedback status/priority/response (A3/A4/A5), employee HR read (BUG 1), upload-logo ownership (A6).
- **Tenant isolation**: PASS (spot-checked everywhere; cross-tenant rejected by tests).
- **Branch isolation**: PASS (queries filtered by branchId).
- **Rate limiting**: `LOGIN` now enforced (C1). `REGISTER` enforced. Other profiles defined but unused (see §13).
- **Headers (next.config.ts)**: HSTS (prod), X-Frame-Options, nosniff, Referrer-Policy present. CSP weakened by `'unsafe-inline' 'unsafe-eval'` and `connect-src ws: wss:` (any host) — see §13.
- **Cron auth (C9)**: query-param secret removed; Bearer-only. (Endpoint still permits unauthenticated access when `CRON_SECRET` is unset — production must set it.)
- **Audit logging**: covers sales/purchases/products/customers/employees/payroll/feedback/settings/cameras/inventory/leave/attendance; password-change + auth events not yet audited (see §13).
- **Error sanitization**: `AppError` masks DB signatures; unexpected-error paths still forward raw `err.message` (see §13).

---

## 7. PWA / Offline Verification

- Service worker, manifest, IndexedDB, offline POS queue, `clientTransactionId` idempotency, and Sync Center all present and exercised by prior suites.
- Idempotent retries verified: retrying an offline sale returns the **same** sale and does **not** double-deduct inventory (`test_step34_reliability.ts` Tests 16–17).
- Concurrency: atomic row lock prevents over-sale (`test_reconciliation.ts`).
- No evidence that financial/auth data is improperly cached in the audited SW strategy.

---

## 8. Docker / Production Verification

- **Dockerfile**: multi-stage `node:20-alpine`, `npm ci`, `prisma generate`, `prisma validate`, `next build`, standalone output, **non-root** `dukaanos` user, healthcheck against `/api/health`. PASS.
- **docker-compose.yml**: `web` + `db` (postgres:16-alpine) with health-gated depends_on; env_file `.env`; `DATABASE_URL` points to `db` service. PASS.
- **prisma.config.ts**: loads `DATABASE_URL`, migrations path set. PASS.
- **docker-entrypoint.sh**: runs `prisma migrate deploy` (idempotent) before `node server.js`. PASS (note: comments contain mojibake bytes but are inert echo strings).
- **.dockerignore**: excludes `node_modules`, `.next`, `.git`, `.env`, docs, generated client. PASS.
- **.env.example**: present.
- **CI** (`.github/workflows/ci.yml`): postgres service, migrate deploy, validate, tsc, lint, reliability test, build. PASS (requires remote GitHub run to execute).
- **CD** (`.github/workflows/cd.yml`): build + push image on tag. PASS (requires remote run).
- **Cron** (`.github/workflows/cron.yml`): 15-min `POST /api/cron` with `Authorization: Bearer` (now correctly Bearer-only). PASS.
- **Prisma client + adapter**: `@prisma/adapter-pg` pool works; client generated. PASS.
- **Env validation**: `validateEnv()` exists; CI scripts set required vars. PASS.

---

## 9. Confirmed Regressions — Fixed

All fixes are minimal, RBAC/tenant-preserving, and non-destructive.

| ID | Severity | File | Issue | Fix |
|----|----------|------|-------|-----|
| A6 | HIGH | `src/app/api/upload/logo/route.ts` | Any authenticated user could write into **any** business's logo dir; `businessId` accepted raw → path traversal; SVG accepted → stored XSS | Added `requireBusinessAccess(businessId)`, `businessId` regex allow-list (`^[a-zA-Z0-9_-]+$`), dropped SVG, sanitized error responses |
| A1 | HIGH | `src/app/actions/product-feedback.actions.ts` | Any authenticated user (any tenant/role) could triage platform-wide bug reports | Added `assertPlatformStaff()` → OWNER/MANAGER only |
| A2 | HIGH | `src/app/actions/product-feedback.actions.ts` | Same gap for feature requests | Same guard |
| A3 | HIGH | `src/app/actions/feedback-management.actions.ts` | CASHIER/EMPLOYEE could change feedback workflow status | `assertFeedbackManager()` → OWNER/MANAGER |
| A4 | HIGH | `src/app/actions/feedback-management.actions.ts` | CASHIER/EMPLOYEE could reprioritize feedback | Same guard |
| A5 | HIGH | `src/app/actions/feedback-management.actions.ts` | Non-staff could post customer-visible feedback replies | Public responses require OWNER/MANAGER |
| BUG1 | HIGH | `src/app/actions/employee.actions.ts` | Any business member could read any employee's salary/HR record via `getEmployeeAction` | Required OWNER/MANAGER via `requireBusinessAccess` |
| C1 | MED | `src/lib/auth/auth.ts` | Login brute-force had no throttling (`RATE_LIMITS.LOGIN` unused) | Wired `enforceRateLimit('LOGIN', email)` (best-effort, never blocks legit auth) |
| C9 | MED | `src/app/api/cron/route.ts` | Cron secret accepted via `?secret=` query param (logged/leaked) and dual-check | Removed query-param path; Bearer-only |

---

## 10. Test Results

| Suite | Result | Notes |
|-------|--------|-------|
| `prisma validate` | PASS | Schema valid |
| `tsc --noEmit` | PASS | 0 errors |
| `npm test` → `test_step34_reliability.ts` | PASS | 26/26 |
| `test_step33_security.ts` | PASS | 25/25 |
| `test_production_smoke.ts` | PASS | Full workflow 100% |
| `test_reconciliation.ts` | PASS | Stock/sales/Udhaar/concurrency 100% |
| `npm run build` | PASS | Compiled successfully (54s) |
| CI / CD / cron workflows | NOT RUN (remote) | Require GitHub Actions run; config verified statically |

Skipped locally (require remote GitHub execution): CI/CD pipeline jobs. Reported as requiring a remote run per instructions — **not** claimed as verified.

---

## 11. Exact Files Changed

- `src/app/api/upload/logo/route.ts` — membership check, path-traversal + SVG fix
- `src/app/actions/product-feedback.actions.ts` — OWNER/MANAGER guard on triage actions
- `src/app/actions/feedback-management.actions.ts` — OWNER/MANAGER guard on status/priority/public response
- `src/app/actions/employee.actions.ts` — OWNER/MANAGER guard on `getEmployeeAction`
- `src/lib/auth/auth.ts` — login rate limiting
- `src/app/api/cron/route.ts` — Bearer-only cron auth

No data, models, migrations, or existing features were removed.

---

## 12. Exact Bugs Fixed

1. Unauthenticated-by-role logo upload with path traversal + stored-XSS (A6).
2. Unauthenticated platform-wide bug/feature triage by any user (A1/A2).
3. Feedback status/priority change and public reply by non-staff (A3/A4/A5).
4. Employee HR/salary data exposure to any business member (BUG 1).
5. Missing login brute-force throttling (C1).
6. Cron secret leakage via query parameter (C9).

---

## 13. Remaining Issues / Risks (non-blocking)

1. **Rate limiter is in-memory** (`rate-limiter.ts`): resets on deploy/restart; not shared across instances. External profile calls (POS_CHECKOUT, CUSTOMER_PAYMENT, COMMUNICATION_SEND, etc.) are defined but unused. *Recommend* Redis/DB-backed limiter for multi-instance production.
2. **CSP weakened** (`next.config.ts`): `'unsafe-inline' 'unsafe-eval'` in `script-src` and `connect-src ws: wss:` (any host). *Recommend* tightening + nonces.
3. **Cron open when `CRON_SECRET` unset**: endpoint proceeds unauthenticated if the var is missing. *Recommend* rejecting when unset in production (`NODE_ENV=production` gate).
4. **External comms processor intentionally absent** (Step 28 reverted): `CommunicationMessage` queue and `MessageTemplate`/`MessageAutomation` models have no production sender (no WhatsApp/SMS/email provider). In-app/announcement/digest paths work. Not a regression — by prior design.
5. **Audit gaps**: password change (`settings/security.ts`) and auth (login success/failure) events are not audit-logged.
6. **Raw error messages to clients**: unexpected (non-`AppError`) exceptions still forward `err.message` from catch blocks in action files.
7. **Analytics/report timezone**: `date-utils.ts` `timezone` param unused; `business-reports.ts:308` hardcodes `'Asia/Karachi'`. Branch filtering not exposed for daily/weekly/monthly/yearly report pages (B3); `printable-report.tsx` auto-prints on mount (double print with manual button).
8. **Sidebar vs content business context**: `dashboard/layout.tsx` uses `memberships[0]` for the displayed active business while pages use cookie-aware `getActiveBusiness()`. Functional mismatch only when the active-business cookie differs from memberships[0]; reads remain correctly scoped.
9. **Disconnected internal functions**: `getFeedbackTrendAnalysis` and `syncAdvisorNotifications` are not wired into the advisor engine/cron. Preserved intentionally; not breaking.

---

## 14. Items Requiring Manual Production / GitHub Verification

- **GitHub Actions CI/CD/cron**: `.github/workflows/*` must be run on GitHub (postgres service, build, push) — cannot execute locally. Config statically verified.
- **Real external deployment**: Docker image build/push to GHCR, `prisma migrate deploy` against the managed PostgreSQL, health/cron probes against the live HTTPS domain, and PWA install on a real device should be confirmed in the target environment.
- **`CRON_SECRET` / `AUTH_SECRET` / VAPID keys**: must be provisioned as production secrets before go-live (see launch checklist §1).
