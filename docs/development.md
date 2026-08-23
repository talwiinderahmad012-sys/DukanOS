# DukaanOS Development Guide

## Environment Setup
1. Duplicate `.env.example` to `.env.local`
2. Update `DATABASE_URL` with a valid PostgreSQL connection string.
3. Generate a secure `AUTH_SECRET` (e.g., using `npx auth secret`).

## Commands
- **Install**: `npm ci`
- **Development Server**: `npm run dev`
- **Build for Production**: `npm run build`
- **Linting**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Full CI Pipeline**: `npm run ci` (prisma generate → validate → typecheck → test → build)
- **Quick CI Script**: `npm run ci`

## Database Commands
- **Generate Client**: `npx prisma generate` (Updates the TypeScript types based on schema changes)
- **Validate Schema**: `npx prisma validate`
- **Migrate (Dev)**: `npx prisma migrate dev --name <name>`
- **Migrate (Production)**: `npx prisma migrate deploy`
- **Migration Status**: `npx prisma migrate status`
- **Prisma Studio**: `npx prisma studio` (Visual UI for the database)

## Testing
- **Run Purchases Integration Tests**: `npx tsx src/scripts/test_purchases.ts`
- **Run Sales & POS Integration Tests**: `npx tsx src/scripts/test_sales.ts`
- **Run Reports, Analytics & Advisor Tests**: `npx tsx src/scripts/test_reports_advisor.ts`
- **Run Step 34 Reliability Tests**: `npx tsx src/scripts/test_step34_reliability.ts`

## Error Handling & Logging
- Use `AppError` from `src/lib/errors/app-error.ts` for throwing typed errors with HTTP status codes.
- Use `createError` / `createSuccess` from `src/lib/utils/api-response.ts` for server action responses.
- Use `logger` from `src/lib/logging/logger.ts` for structured logging. Never log secrets or sensitive PII.
- Attach `correlationId` to all important operations using `createCorrelationId()`.

## Health & Monitoring
- Health endpoints: `/api/health` and `/api/health/ready`.
- System dashboard: `/dashboard/system` (owner-only).
- Use `src/lib/jobs/job-runner.ts` for background job reliability.

## Authentication & Routing
- Ensure `AUTH_SECRET` is properly set in `.env`.
- All protected routes should reside under `/dashboard`, which is protected by `dashboard/layout.tsx`.
- Do not expose Prisma logic in Client Components (components marked with `'use client'`). Use Server Actions under `src/app/actions`.

