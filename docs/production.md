# DukaanOS v1.0.0 — Production Deployment & Release Engineering (Step 35)

> **For the complete deployment guide including Docker, CI/CD, and rollback procedures, see [`docs/deployment.md`](deployment.md).**
> **For release management and versioning, see [`RELEASE.md`](../RELEASE.md).**

This document provides the canonical production deployment pipeline. For containerised deployments, see the [Docker](#containerised-deployment-docker) section below.

## 1. Production Architecture Overview

DukaanOS is engineered as a unified, high-performance web monolith optimized for reliability and zero unnecessary infrastructure overhead:

```text
               Custom Production Domain (HTTPS)
                              ↓
                  Next.js 16.3 App Router
         (Server Components + Server Actions + API Routes)
                              ↓
              @prisma/adapter-pg Connection Pool
                              ↓
                PostgreSQL 16+ (Database Layer)
```

---

## 2. Production Environment Configuration

All environment variables are documented in `.env.example`. The `src/lib/config/env.ts` module is the authoritative runtime validation layer — it throws at startup if any required variable is missing.

Never commit real secrets. Use environment-specific `.env` files or your hosting provider's secret manager.

```env
# 1. PostgreSQL 16+ Connection String
DATABASE_URL="postgresql://username:password@localhost:5432/dukaanos?schema=public&sslmode=prefer"

# 2. NextAuth v5 Secret
AUTH_SECRET="your-generated-32-byte-secret"
NEXTAUTH_URL="https://app.dukaanos.com"

# 3. Public Domain
NEXT_PUBLIC_APP_URL="https://app.dukaanos.com"

# 4. Scheduled Maintenance Cron Secret
CRON_SECRET="your-generated-cron-secret"

# 5. Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BK..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:support@dukaanos.com"

# 6. Runtime Mode
NODE_ENV="production"
PORT=3000
```

---

## 3. Deterministic Production Build Pipeline

The full production build pipeline is deterministic and reproducible:

```bash
# 1. Install dependencies (npm ci ensures lockfile parity)
npm ci

# 2. Generate Prisma Client (postinstall hook runs this automatically;
#    explicit call for clarity in CI/CD)
npx prisma generate

# 3. Validate Prisma schema integrity
npx prisma validate

# 4. TypeScript type checking
npx tsc --noEmit

# 5. Run reliability / production hardening tests
npx tsx src/scripts/test_step34_reliability.ts

# 6. Build Next.js production application
npm run build

# 7. Apply database migrations (after build, before start)
npx prisma migrate deploy

# 8. Start production server
npm start
```

Alternatively, run the combined CI pipeline script:
```bash
npm run ci
```

### CI/CD

- **CI** (`.github/workflows/ci.yml`): Runs on every push/PR to `main`. Validates environment, Prisma schema, TypeScript, linting, reliability tests, and production build.
- **CD** (`.github/workflows/cd.yml`): Triggers on version tag push (`v*`). Builds and pushes a Docker image to GitHub Container Registry, then creates a GitHub Release.
- Use `node-version-file: .nvmrc` in GitHub Actions to pin the Node.js version.

---

## 4. Containerized Deployment (Docker)

The project includes a multi-stage `Dockerfile` that produces a minimal production image.

```bash
# Build
docker build -t dukaanos:v1.0.0 .

# Run (with .env mounted)
docker run -d --name dukaanos -p 3000:3000 --env-file .env dukaanos:v1.0.0

# Or with Docker Compose (see docs/deployment.md)
docker compose up -d --build
```

## 5. First-Time Production Bootstrap

To create the initial store owner account cleanly without demo or dummy data:

```bash
npx tsx src/scripts/bootstrap_owner.ts <owner_email> <password> "Owner Name" "Store Name"
```

Or visit `https://app.dukaanos.com/register` directly on initial launch.

---

## 6. Health Monitoring & Background Cron

- **Health Check (`GET /api/health`)**:
  - Responds HTTP 200 with JSON database status, uptime, and release version `1.0.0`.
  - Used by load balancers and container orchestrators for uptime health checks.
- **Scheduled Maintenance Cron (`POST /api/cron`)**:
  - Triggered every 15 minutes by an external cron worker passing `Authorization: Bearer <CRON_SECRET>`.
  - Performs camera connectivity polling, advisor alerts evaluation, and communication retry sweeps.

---

## 7. Rollback Runbook

- **Application Rollback**:
  - Deploy previous git release tag or container image.
  - Restart Node process: `pm2 restart dukaanos` or `systemctl restart dukaanos`.
- **Database Safeguards**:
  - DukaanOS database schema modifications are backward-compatible.
  - In case of critical disaster recovery, restore the latest point-in-time PostgreSQL snapshot.
