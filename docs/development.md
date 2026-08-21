# DukaanOS Development Guide

## Environment Setup
1. Duplicate `.env.example` to `.env.local`
2. Update `DATABASE_URL` with a valid PostgreSQL connection string.
3. Generate a secure `AUTH_SECRET` (e.g., using `npx auth secret`).

## Commands
- **Install**: `npm install`
- **Development Server**: `npm run dev`
- **Build for Production**: `npm run build`
- **Linting**: `npm run lint`

## Database Commands
- **Push Schema**: `npx prisma db push` (Use this during rapid prototyping)
- **Generate Client**: `npx prisma generate` (Updates the TypeScript types based on schema changes)
- **Prisma Studio**: `npx prisma studio` (Visual UI for the database)

## Testing
- **Run Purchases Integration Tests**: `npx tsx src/scripts/test_purchases.ts`
- **Run Sales & POS Integration Tests**: `npx tsx src/scripts/test_sales.ts`
- **Run Reports, Analytics & Advisor Tests**: `npx tsx src/scripts/test_reports_advisor.ts`

## Authentication & Routing
- Ensure `AUTH_SECRET` is properly set in `.env`.
- All protected routes should reside under `/dashboard`, which is protected by `dashboard/layout.tsx`.
- Do not expose Prisma logic in Client Components (components marked with `'use client'`). Use Server Actions under `src/app/actions`.

