# Changelog

All notable changes to DukaanOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-08-23

### Added
- Complete retail POS and business intelligence platform with multi-tenant architecture.
- Next.js 16.3 App Router with React 19 Server Components and Server Actions.
- Authentication via Auth.js v5 with Credentials provider (bcrypt password hashing).
- Multi-tenant Business/Branch model with role-based access control (OWNER, MANAGER, CASHIER, EMPLOYEE).
- Full product catalog: Products, Categories, Suppliers with SKU/barcode tracking.
- Purchases & inventory: Purchase receipts, stock movements, cost price history, safe cancellation.
- POS Terminal: Real-time barcode scanning, concurrency-safe stock decrement, proportional discount allocation, realized profit tracking.
- Customer credit management (Udhaar): Credit sales, payment recovery, running ledger, outstanding balances.
- Printable invoices (thermal/A4) with configurable receipt header/footer.
- Employee management: Attendance, leave requests, payroll, salary history, complaints.
- Customer feedback system: Single-use invite tokens, 5-star ratings, category breakdown, resolution workflow.
- Internal communications: Direct messaging, announcements/broadcasts, activity center.
- CCTV monitoring: RTSP/ONVIF/IP camera health checks, HLS streaming, credential isolation.
- PWA: Service worker with offline shell, IndexedDB for offline POS, idempotent sync with clientTransactionId.
- Web Push notifications: VAPID signing, multi-device subscriptions, dead endpoint cleanup.
- Business advisor: Rule engine (low stock, slow moving, sales/profit decline, credit risk, expense spike), health score 0-100.
- Analytics: Daily/weekly/monthly/yearly reports, day-over-day/month-over-month growth, cohort analysis, forecasting.
- Product analytics: Privacy-first usage telemetry, activation funnel, health score, bug triage.
- SaaS plans: Feature flags, usage limits, FREE plan with all core features.
- System settings: Business configuration, data export (JSON/CSV), diagnostics.
- Owner monitoring dashboard (owner-only): Real-time metrics, database latency, cache performance, critical errors.
- Centralized error handling (AppError) with deterministic error codes and database error sanitization.
- Structured JSON logging with correlation IDs, sensitive key redaction (passwords, tokens, secrets, salaries).
- Background JobRunner with retry logic and concurrency guards.
- Health check endpoints: `/api/health` (liveness) and `/api/health/ready` (readiness).
- Scheduled maintenance cron endpoint: `/api/cron` (camera health, advisor findings, scheduled reports).
- Security hardening: HTTP security headers, rate limiting, input sanitization, zero client trust for tenancy.
- Point-in-time recovery guidance with PostgreSQL backup strategies.

### Security
- HTTP security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (production only).
- Sliding-window in-memory rate limiting on auth, registration, feedback, data export, and communication endpoints.
- Sensitive data redaction in all log output (password, token, secret, salary, cardNumber, API keys, RTSP URLs).
- Zero-client-trust tenancy: businessId and branchId are always derived from the authenticated session, never from client input.
- Role-based capability enforcement on server side for all operations.

### Known Issues
- None at launch.
