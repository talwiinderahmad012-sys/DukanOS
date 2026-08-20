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

## Authentication Layer
Using Auth.js (NextAuth) mapped in `src/lib/auth/auth.ts`. Session data dictates access rights and business association.
