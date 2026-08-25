# Step 40 Remediation Plan

## Current State
- 40 steps PASS
- 0 steps PARTIAL
- 0 steps MISSING
- Health score 100/100

## Status: COMPLETE

All remediation phases have been completed and verified.

### Phase 1 — Expense CRUD (COMPLETE)
- `src/services/expenses.ts` — create/list/update/cancel implemented
- `src/app/actions/expenses.actions.ts` — server actions for CRUD + cancel
- `src/app/dashboard/expenses/page.tsx` — list with search, branch filter, category filter, date range, pagination
- `src/app/dashboard/expenses/new/page.tsx` — create form with branch selector, RBAC redirect
- `src/app/dashboard/expenses/[id]/page.tsx` — edit form restricted to OWNER/MANAGER
- Navigation added in `layout.tsx` and `mobile-nav.tsx`
- Tests pass in `test_step40_finalization.ts` (16/16)

### Phase 2 — Report Branch Filtering (COMPLETE)
- Branch filtering added to daily/weekly/monthly/yearly reports
- Server-side branch ownership validation in `report.actions.ts`
- CSV export connected to report viewer via `ExportButton` component
- Tests pass in `test_step40_finalization.ts`

### Phase 3 — CSP Hardening (COMPLETE)
- `unsafe-eval` removed in production
- `connect-src` restricted to `'self'` in production
- Documented exceptions for Next.js compatibility

### Phase 4 — Production Rate Limiter (COMPLETE)
- Central provider architecture verified
- Fail-closed behavior for production Redis strategy
- Bounded memory fallback for non-production
- Tests pass in `test_step39_hardening.ts` (112/112)

### Phase 5 — Error Sanitization (COMPLETE)
- AppError architecture sanitizes database errors
- Stack traces omitted from JSON responses
- Sensitive data redacted in logs

### Phase 6 — Test Infrastructure (COMPLETE)
- All 5 server-only test suites now execute via standardized bootstrap:
  - `test_communications.ts`
  - `test_settings_step25.ts`
  - `test_analytics_step31.ts`
  - `test_step32_reporting.ts`
  - `test_analytics_step26.ts`

### Phase 7 — .bak Cleanup (COMPLETE)
- All `.bak` files removed from `src/app/dashboard/expenses/`

### Phase 8 — Windows Build (COMPLETE)
- `npm run build` passes on Windows
- No more 0xC0000374 crash
**Finding**: Some catch blocks forward raw `err.message`.
**Files involved**: Multiple action files and API routes.
**Intended fix**: Audit catch blocks, replace raw `err.message` forwarding with `createError(AppErrors.INTERNAL_ERROR, ...)` or AppError instances.
**Tests**: Step 33 security tests.

### Phase 6 — Platform Plans Navigation
**Finding**: `/dashboard/platform/plans` is orphaned (no navigation link).
**Files involved**:
- `src/app/dashboard/platform/plans/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/components/layout/mobile-nav.tsx`
**Intended fix**: Add "Platform Plans" navigation entry for OWNER role, or document as internal/admin-only with explicit RBAC.
**Tests**: Navigation verification.

### Phase 7 — Feedback Advisor Integration
**Finding**: `getFeedbackTrendAnalysis` and `syncAdvisorNotifications` exist but aren't wired into advisor engine/cron.
**Files involved**:
- `src/services/advisor/index.ts`
- `src/services/reports/scheduled.ts`
- `src/services/feedback-management.ts`
**Intended fix**: Wire feedback trend analysis into scheduled advisor cron, add deduplication.
**Tests**: Feedback-advisor integration test.

### Phase 8 — Step 40 Finalization
**Finding**: Step 40 is missing.
**Files involved**:
- `docs/recovery/STEP_40_FINALIZATION.md` (to create)
- `src/scripts/test_step40_finalization.ts` (to create)
**Intended fix**: Define Step 40 as final completion/release validation step.
**Tests**: Comprehensive step 40 test.

### Phase 9 — Complete Regression Test
Run all existing tests plus new tests.

### Phase 10 — Final Step 1-40 Audit
Create `docs/recovery/STEP_1_40_FINAL_AUDIT.md`.
