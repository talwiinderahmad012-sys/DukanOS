# DukaanOS v1.0.0 — Production Launch Checklist

> For full deployment, rollback, Docker, and CI/CD procedures, see [`docs/production.md`](production.md) and [`docs/deployment.md`](deployment.md).
> For release versioning and tagging, see [`RELEASE.md`](../RELEASE.md).

Use this definitive operational checklist prior to deploying and announcing a live DukaanOS instance.

---

## 1. Pre-Launch Environment & Secrets Verification

- [ ] **PostgreSQL Database**:
  - [ ] Running PostgreSQL 16+ on managed infrastructure (e.g. AWS RDS, DigitalOcean, Supabase, Neon, or Self-Hosted Docker).
  - [ ] Connection pool configured (`DATABASE_URL` with `sslmode=prefer` or `sslmode=require`).
  - [ ] Automated database backups enabled with minimum 7-day point-in-time recovery.
  - [ ] Initial migration applied (`npx prisma migrate deploy`).
- [ ] **Secrets & Keys**:
  - [ ] `AUTH_SECRET`: Strong 32-byte cryptographic random secret (`openssl rand -base64 32`).
  - [ ] `CRON_SECRET`: Dedicated secret for the `/api/cron` maintenance webhook.
  - [ ] `NEXT_PUBLIC_APP_URL`: Set to the official HTTPS domain (e.g. `https://app.dukaanos.com`).
  - [ ] `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`: Generated for Web Push notifications.
  - [ ] `NODE_ENV`: Strictly set to `"production"`.
  - [ ] No `.env` files committed to Git.

---

## 2. Database Migration & Schema Deployment

- [ ] **Prisma Migration**:
  - [ ] Execute `npx prisma migrate deploy` against the target production database.
  - [ ] Verify all tables (`User`, `Business`, `Branch`, `Product`, `Sale`, `Purchase`, `Customer`, etc.) exist with indexes.
- [ ] **Bootstrap Initial Store Owner**:
  - [ ] Run `npm run bootstrap <email> <password> "<Owner Name>" "<Store Name>"` or register via `/register` on clean database.
  - [ ] Confirm no demo fixtures (`Super Mart Demo`, fake products) are seeded into production.

---

## 3. Application Build, CI/CD & System Verification

- [ ] **CI Pipeline**:
  - [ ] GitHub Actions CI (`.github/workflows/ci.yml`) passes on `main` branch.
  - [ ] Verify `prisma validate`, `tsc --noEmit`, `lint`, and `test` all pass.
  - [ ] Verify `npm run build` compiles with 0 errors.
- [ ] **Production Build**:
  - [ ] Execute `npm ci && npx prisma generate && npm run build`.
  - [ ] Verify all static pages, dynamic server actions, and API routes compile with 0 errors.
- [ ] **HTTP Security Headers**:
  - [ ] Verify `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and CSP headers active on all routes.
- [ ] **Health Endpoint**:
  - [ ] Check `GET https://app.dukaanos.com/api/health` returns HTTP 200 with `status: "healthy"` and database connected.
  - [ ] Check `GET https://app.dukaanos.com/api/health/ready` returns HTTP 200 with `status: "ready"`.
- [ ] **Scheduled Cron Setup**:
  - [ ] Configure cloud scheduler / cron to call `POST https://app.dukaanos.com/api/cron` every 15 minutes with `Authorization: Bearer <CRON_SECRET>`.
  - [ ] Verify cron responds with `success: true`.
- [ ] **Deployment Method**:
  - [ ] Choose deployment method: Docker (`.github/workflows/cd.yml`) or manual (see `docs/deployment.md`).
  - [ ] Verify `.nvmrc` and `engines` field in `package.json` match required Node.js version.
  - [ ] Verify `.dockerignore` excludes `node_modules`, `.next`, `.git`, and `.env`.

---

## 4. End-to-End Smoke Test

- [ ] **Authentication & Tenancy**:
  - [ ] Log in with initial owner credentials.
  - [ ] Verify store switcher displays active business context and primary branch.
- [ ] **Core Retail Workflows**:
  - [ ] Add a new product catalog item with SKU and selling price.
  - [ ] Perform stock purchase receiving goods into branch ledger.
  - [ ] Complete cash POS sale; verify immediate stock deduction and receipt preview.
  - [ ] Create customer and record split credit sale (Udhaar); verify ledger balance update.
  - [ ] Record customer credit recovery payment; verify outstanding reconciles to 0.
- [ ] **Reports & Audit Ledger**:
  - [ ] Check Daily Sales report reflects gross revenue and realized profit.
  - [ ] Verify Audit Log logs owner transactions.
- [ ] **PWA & Offline Capability**:
  - [ ] Install PWA on mobile/desktop; verify offline cached shell and icon rendering.

---

## 5. Rollback Runbook

- **Application Rollback**:
  - Keep previous release build artifacts / Git release tags (`v0.19.0`, `v1.0.0`).
  - To roll back application: redeploy previous container or checkout previous tag and restart Node.js server.
- **Database Rollback**:
  - All database schema changes in v1.0.0 are additive and non-destructive.
  - In case of critical corruption, restore the pre-deployment database backup snapshot.
