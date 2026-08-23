# DukaanOS — Testing Architecture & Regression Strategy (Step 19)

## 1. Automated Test Suite Map

All tests are runnable standalone using `npx tsx src/scripts/<test_file>.ts`.

| Suite File | Scope Covered |
|---|---|
| [`test_production_hardening.ts`](file:///d:/DukanOS/src/scripts/test_production_hardening.ts) | Cross-tenant isolation matrix, role permissions, rate limiting, sanitization, secret masking. |
| [`test_multi_business_branch.ts`](file:///d:/DukanOS/src/scripts/test_multi_business_branch.ts) | Multi-business creation, branch performance aggregation, business archive status, ownership transfer. |
| [`test_system_settings.ts`](file:///d:/DukanOS/src/scripts/test_system_settings.ts) | Settings persistence, invoice prefixing, role discount caps, sanitized export, diagnostics. |
| [`test_sales.ts`](file:///d:/DukanOS/src/scripts/test_sales.ts) | POS checkout, inventory deduction, credit sales, cash validation, receipt generation. |
| [`test_purchases.ts`](file:///d:/DukanOS/src/scripts/test_purchases.ts) | Purchase orders, inventory replenishment, supplier balance tracking. |
| [`test_reports_advisor.ts`](file:///d:/DukanOS/src/scripts/test_reports_advisor.ts) | Daily/monthly reports, stock velocity, profit calculations, business advisor alerts. |
| [`test_cctv_monitoring.ts`](file:///d:/DukanOS/src/scripts/test_cctv_monitoring.ts) | Camera creation, RTSP parser, mock health ping, credential encryption. |
| [`test_pwa_offline_sync.ts`](file:///d:/DukanOS/src/scripts/test_pwa_offline_sync.ts) | Offline sales queue, idempotent synchronization, stock conflicts. |
| [`test_employees.ts`](file:///d:/DukanOS/src/scripts/test_employees.ts) | Employee roster, attendance check-in/out, leave requests, salary disbursement. |
| [`test_customer_feedback.ts`](file:///d:/DukanOS/src/scripts/test_customer_feedback.ts) | QR feedback invite token, anonymous feedback submission, sentiment categorization. |
| [`test_advanced_notifications.ts`](file:///d:/DukanOS/src/scripts/test_advanced_notifications.ts) | Web Push subscriptions, notification preferences, daily owner summary digest. |
| [`test_external_communications.ts`](file:///d:/DukanOS/src/scripts/test_external_communications.ts) | SMS/WhatsApp gateway providers, message templates, customer communication history. |

---

## 2. Running Regression Tests

Run all tests before pushing to production:

```bash
# Production hardening & security test
npx tsx src/scripts/test_production_hardening.ts

# Multi-tenant & branch test
npx tsx src/scripts/test_multi_business_branch.ts

# System settings & export test
npx tsx src/scripts/test_system_settings.ts

# Build verification
npm run build
```
