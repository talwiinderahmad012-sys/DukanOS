# DukaanOS — Production Deployment Guide (Step 35)

> **Version:** v1.0.0  |  **Next.js:** 16.3.1  |  **Node.js:** >=20.18.0  |  **Database:** PostgreSQL 16+

## 1. Deployment Architecture

```text
                    HTTPS Endpoint (APP_URL)
                              ↓
         +------------------------------------+
         |   Node.js 20  (DukaanOS server)   |
         |     next start  (or Docker)        |
         +------------------------------------+
                              ↓
         |  @prisma/adapter-pg (connection    |
         |    pool via pg driver)              |
         +------------------------------------+
                              ↓
              PostgreSQL 16+  (DATABASE_URL)
```

**Deployment options (all provider-agnostic):**

| Option               | File / Command              | Best For              |
|----------------------|-----------------------------|-----------------------|
| Docker (recommended) | `Dockerfile` + `docker compose` | Any self-managed host |
| CI/CD image          | `.github/workflows/cd.yml`  | Automated deployments   |
| Manual install       | See [Manual Deployment](#3-manual-deployment) | Bare-metal / VPS     |

---

## 2. Environment Requirements

### Required Environment Variables

| Variable            | Description                                      | Example                          |
|---------------------|--------------------------------------------------|----------------------------------|
| `DATABASE_URL`      | PostgreSQL connection string (SSL recommended)  | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `AUTH_SECRET`       | NextAuth secret (32+ bytes)                       | `openssl rand -base64 32`        |
| `NEXTAUTH_SECRET`   | Alias of `AUTH_SECRET` (set one or both)           | Same as `AUTH_SECRET`            |
| `NEXTAUTH_URL`      | Base HTTPS URL for callbacks                      | `https://app.example.com`        |
| `APP_URL`           | Application public URL (or `NEXT_PUBLIC_APP_URL`)  | `https://app.example.com`        |
| `CRON_SECRET`       | Secret for `/api/cron` maintenance endpoint        | `openssl rand -hex 32`           |

### Optional Environment Variables

| Variable                       | Description                          | Default                |
|--------------------------------|--------------------------------------|------------------------|
| `NEXT_PUBLIC_APP_URL`          | Public app URL (fallback for ssr)    | —                      |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key                  | Dev fallback           |
| `VAPID_PRIVATE_KEY`            | Web Push private key                 | Dev fallback (change in production!) |
| `VAPID_SUBJECT`                | VAPID subject (mailto:)              | `mailto:support@dukaanos.com` |
| `NODE_ENV`                     | Runtime mode                         | `production`           |
| `PORT`                         | Custom port                          | `3000`                 |

### Generate Secrets

```bash
# Auth secret (32+ bytes)
openssl rand -base64 32

# Cron secret (hex)
openssl rand -hex 32

# VAPID keys for Web Push
npx web-push generate-vapid-keys
```

See `.env.example` for the complete template.

### Runtime Validation

`src/lib/config/env.ts` enforces required variables at runtime. The application will not start if:
- `DATABASE_URL` is missing
- `AUTH_SECRET` is missing
- Neither `NEXTAUTH_SECRET` nor `NEXTAUTH_URL` is set
- `APP_URL` / `NEXT_PUBLIC_APP_URL` is missing
- `CRON_SECRET` is missing

---

## 3. Production Build Pipeline

The deterministic production build sequence:

```text
npm ci              →  install dependencies (with devDependencies)
  ↓
npm run postinstall  →  prisma generate
  ↓
npx prisma generate  →  (explicit, idempotent)
  ↓
npx prisma validate  →  validate schema integrity
  ↓
npx tsc --noEmit     →  TypeScript typecheck
  ↓
npm test             →  run reliability test suite
  ↓
npm run build        →  next build (production)
  ↓
npx prisma migrate deploy  →  apply database migrations
  ↓
npm start            →  next start (production server)
```

Use the combined `npm run ci` script to run the local build-check pipeline:

```bash
npm run ci
# = prisma generate && prisma validate && tsc --noEmit && test && next build
```

---

## 4. Database Migration Strategy

### Initial Migration

The initial schema migration is at `prisma/migrations/001_init/`. It was generated from the production schema using `prisma migrate diff --from-empty`.

### Migration Workflow

**New migrations** (development):
```bash
npx prisma migrate dev --name <descriptive_name>
# - Generates migration SQL in prisma/migrations/<timestamp>_<name>/
# - Applies to the dev database
# - Triggers client regeneration
```

**Apply migrations** (production / staging):
```bash
npx prisma migrate deploy
# Idempotent: only applies pending migrations
# Safe for zero-downtime deployments (additive changes only)
```

**Check migration status**:
```bash
npx prisma migrate status
```

**Existing database (db push)** transition:
If your database was set up with `prisma db push` (no migration history), mark the initial migration as applied:
```bash
npx prisma migrate resolve --applied 001_init
```

### Migration Safety Rules
- All migrations are **additive** (new tables, new columns, new indexes).
- Never modify or delete an existing migration file.
- Never drop columns or tables in production migrations.
- Use `@@index` and `@@unique` in schema for all new indexes.
- Test migrations against a staging database that mirrors production data volume.

---

## 5. Docker Deployment (Recommended)

### Build & Run

```bash
# Build with required build args (NEXT_PUBLIC_* vars are inlined at build time)
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.example.com \
  --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=BG... \
  -t dukaanos:v1.0.0 .

# Run with environment variables (runtime secrets are injected here)
docker run -d \
  --name dukaanos \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dukaanos?sslmode=require" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e NEXTAUTH_URL="https://app.example.com" \
  -e APP_URL="https://app.example.com" \
  -e CRON_SECRET="$(openssl rand -hex 32)" \
  dukaanos:v1.0.0
```

**Note:** `NEXT_PUBLIC_*` environment variables are inlined at build time and
cannot be overridden at runtime. All other secrets (`DATABASE_URL`, `AUTH_SECRET`,
etc.) are read from the container environment at startup.

The Docker entrypoint automatically runs `prisma migrate deploy` before starting the
server. To skip migrations (e.g., when running with an external migration service),
set `SKIP_MIGRATIONS=true` in the container environment.

### Docker Compose

A `docker-compose.yml` is included in the repository root for full-stack deployment
with a managed PostgreSQL instance. It handles build args, health checks, and
database readiness.

```bash
# 1. Create .env from .env.example and configure production values
cp .env.example .env
# Edit .env with your production secrets and domain

# 2. Deploy (builds image, starts app + PostgreSQL, runs migrations automatically)
docker compose up -d --build

# 3. Bootstrap the initial owner (first run only)
docker compose run --rm web npm run bootstrap <email> <password> "Owner Name" "Store Name"

# Alternatively, register at https://app.example.com/register

# 4. Monitor
docker compose logs -f web
docker compose ps
```

The Docker entrypoint automatically runs `prisma migrate deploy` before starting
the server. To skip (e.g., if using an external DB admin), set
`SKIP_MIGRATIONS=true` in the container environment.
```

For manual Docker without Compose:
```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.example.com \
  --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=BG... \
  -t dukaanos:v1.0.0 .

docker run -d \
  --name dukaanos \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dukaanos?sslmode=require" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e CRON_SECRET="$(openssl rand -hex 32)" \
  dukaanos:v1.0.0
```

---

## 6. Manual Deployment (Bare Metal / VPS)

```bash
# 1. Clone and checkout release tag
git clone https://github.com/<owner>/DukanOS.git
cd DukaanOS
git checkout v1.0.0

# 2. Install Node.js (>=20.18.0)
#    Using nvm: nvm use

# 3. Install dependencies
npm ci

# 4. Configure environment
cp .env.example .env
# Edit .env with production values

# 5. Generate Prisma client
npx prisma generate

# 6. Apply database migrations
npx prisma migrate deploy

# 7. Build
npm run build

# 8. Bootstrap initial owner (first run only)
npm run bootstrap <owner_email> <password> "<Owner Name>" "<Store Name>"

# 9. Start the server (use PM2 or systemd for production)
npm start
# Or: pm2 start npm --name dukaanos -- start
```

### Process Management (PM2)

```bash
npm install -g pm2
pm2 start npm --name dukaanos -- start
pm2 save
pm2 startup
```

### Process Management (systemd)

```ini
# /etc/systemd/system/dukaanos.service
[Unit]
Description=DukaanOS
After=network.target

[Service]
Type=simple
User=dukaanos
WorkingDirectory=/opt/dukaanos
EnvironmentFile=/opt/dukaanos/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable dukaanos
sudo systemctl start dukaanos
sudo systemctl status dukaanos
```

---

## 7. Scheduled Cron Setup

External cron must trigger `POST /api/cron` **every 15 minutes** with the `CRON_SECRET` bearer token.

### Using GitHub Actions (scheduled workflow)

Create `.github/workflows/cron.yml`:

```yaml
name: Cron Maintenance
on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:

jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - name: Run cron maintenance
        run: |
          curl -fsSL -X POST https://app.dukaanos.com/api/cron \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Using a self-hosted cron job

```bash
# Add to crontab (crontab -e)
*/15 * * * * curl -fsSL -X POST https://app.dukaanos.com/api/cron -H "Authorization: Bearer YOUR_CRON_SECRET" >/dev/null 2>&1
```

### Using a managed scheduler (generic)

| Provider      | Cron expression | Endpoint                        | Auth header       |
|---------------|-----------------|---------------------------------|-------------------|
| GitHub Actions| `*/15 * * * *`| `POST /api/cron` | `Authorization: Bearer <CRON_SECRET>` |
| AWS EventBridge | `rate(15 minutes)` | `POST /api/cron` | `Authorization: Bearer <CRON_SECRET>` |
| Google Cloud Scheduler | `*/15 * * * *` | `POST /api/cron` | `Authorization: Bearer <CRON_SECRET>` |

---

## 8. Health Checks & Monitoring

| Endpoint              | Purpose              | Expected Response | HTTP Status |
|-----------------------|----------------------|--------------------|:-----------:|
| `GET /api/health`     | Liveness probe       | `{ status: "healthy", database: "connected", ... }` | 200 |
| `GET /api/health/ready` | Readiness probe    | `{ status: "ready", database: "ok", ... }` | 200 |
| `POST /api/cron`      | Maintenance (15-min) | `{ success: true, results: {...} }` | 200 |

### Load Balancer Configuration
- **Health check path:** `/api/health/ready`
- **Healthy threshold:** 2 consecutive successes
- **Unhealthy threshold:** 3 consecutive failures
- **Timeout:** 5 seconds
- **Interval:** 30 seconds

### Reverse Proxy (NGINX)

```nginx
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/css application/javascript application/json;

    # Static assets
    location /_next/static/ {
        alias /opt/dukaanos/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
    }
}
```

---

## 9. Post-Deployment Verification

```bash
# 1. Health check
curl -fsSL https://app.dukaanos.com/api/health

# 2. Readiness check
curl -fsSL https://app.dukaanos.com/api/health/ready

# 3. Cron (if configured)
curl -fsSL -X POST https://app.dukaanos.com/api/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 4. Trigger a full reliability test against production DB
# (Use with extreme caution — creates temporary test fixtures)
npx tsx src/scripts/test_step34_reliability.ts
```

---

## 10. Rollback Procedure

See [RELEASE.md#4-rollback-procedure](RELEASE.md#4-rollback-procedure).
