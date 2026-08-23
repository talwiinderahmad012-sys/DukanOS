# DukaanOS — System Settings, Business Configuration & Data Management (Step 17)

## Overview
Step 17 introduces a centralized Owner Control Center and System Settings suite at `/dashboard/settings`. It unifies store profile presentation, branch management, sales/POS financial guardrails, role-based discount permissions, invoice numbering sequences, Business Advisor sensitivity thresholds, thermal receipt customization, personal account security (password change with bcrypt), team member role management with strict owner protection, sanitized data export (CSV/JSON), and live system diagnostics.

---

## 1. Settings Architecture & Navigation

The settings cockpit is located at `/dashboard/settings` and organized into 4 functional quadrants:

```text
/dashboard/settings
├── Store & Operations
│   ├── Business Profile (/dashboard/settings/business)
│   ├── Branches (/dashboard/settings/branches)
│   ├── Sales & POS Rules (/dashboard/settings/sales)
│   └── Receipts & Invoices (/dashboard/settings/receipts)
├── Intelligence & Alerts
│   ├── Business Advisor (/dashboard/settings/advisor)
│   ├── Notifications & Alerts (/dashboard/settings/notifications)
│   ├── External Communications (/dashboard/settings/communications)
│   └── Security Cameras (CCTV) (/dashboard/cameras)
├── Team, Security & Account
│   ├── Team & Members (/dashboard/settings/members)
│   ├── Security & Password (/dashboard/settings/security)
│   └── Personal Profile (/dashboard/settings/profile)
└── Data & System Health
    ├── Data Export (/dashboard/settings/data-export)
    ├── Backup & Recovery (/dashboard/settings/backup)
    └── System Information & Health (/dashboard/settings/system)
```

---

## 2. Business Profile & Presentation Rules

### Presentation vs Financial Safety
- Store profile fields (`name`, `phone`, `email`, `address`, `city`, `operatingHours`, `currencySymbol`, `currencyPosition`, `timezone`) alter UI rendering and future reporting boundaries.
- Display updates **never rewrite historical invoice snapshots or recalculate recorded numeric totals**.

### Timezone Integrity
- DukaanOS defaults to `Asia/Karachi` and supports IANA timezone strings (`Asia/Dubai`, `Europe/London`, `America/New_York`).
- Business days, monthly aggregation windows, and daily digest dispatches respect this setting.

---

## 3. Sales & POS Financial Guardrails

### Server-Enforced Discount Caps
- POS discounts are validated on the server inside transaction blocks:
  - **CASHIER**: Default maximum 5.0% discount.
  - **MANAGER**: Default maximum 15.0% discount.
  - **OWNER**: Unrestricted.
- Dispatches exceeding the assigned role threshold are rejected with an explicit error.

### Invoice Numbering
- Stores custom invoice prefixes (e.g. `INV-`, `POS-`, `DUK-`) and starting sequences.
- Prefix updates apply exclusively to future sales transactions; existing invoice numbers remain immutable.

### Negative Stock Prohibitions
- Default rule `allowNegativeStock = false` ensures transactions with insufficient inventory roll back atomically without negative stock commit.

---

## 4. Business Advisor Thresholds

Custom threshold parameters stored in `BusinessSetting` are read directly by `generateAdvisorFindings`:
- `salesDeclineThresholdPercent`: Month-over-month revenue drop trigger (default 15%).
- `slowMovingDays`: Inactive product threshold (default 30 days).
- `profitDeclineThresholdPercent`: Margin contraction trigger (default 15%).
- `creditRiskThresholdPercent`: Receivables vs monthly revenue trigger (default 25%).
- Individual rule toggles for out-of-stock, slow-moving, sales drop, profit contraction, and credit risk.

---

## 5. Team Roles & Owner Protection

### Strict Owner Safeguards
- A business must maintain **at least 1 active `OWNER`**.
- An owner cannot remove themselves or be demoted if they are the sole owner of the business.
- Managers cannot promote themselves or create other owners.

---

## 6. User Security & Password Management

- Users can update their display name and phone number.
- Secure password change requires verification of the current password using `bcrypt.compare`, validates length ($\ge 8$ chars), and salts new hashes with `bcrypt.hash(..., 10)`.

---

## 7. Data Export & Backup Architecture

### Data Export (`/dashboard/settings/data-export`)
- Supports full catalog, customers, suppliers, sales, purchases, expenses, and feedback.
- Output formats: **JSON** and **CSV**.
- **Sanitization**: Password hashes, external API tokens, and CCTV credentials are strictly stripped.

### Backup & Disaster Recovery (`/dashboard/settings/backup`)
- Clearly differentiates application JSON exports from database backups.
- Recommends automated infrastructure-level PostgreSQL snapshot and `pg_dump` disaster recovery strategies.

---

## 8. System Diagnostics (`/dashboard/settings/system`)

Monitors:
1. **Database Engine**: Roundtrip query latency (ms) and PostgreSQL engine status.
2. **Auth Subsystem**: NextAuth JWT and bcrypt verification status.
3. **PWA & Offline Sync**: Service Worker, IndexedDB queue, and idempotent sync capabilities.
4. **Push Notifications**: VAPID configuration status.
5. **Messaging Gateway**: Active external communication providers count.
6. **Security Cameras**: Registered CCTV devices and monitoring status.
7. **Entity Ledger Counts**: Live counters for products, sales, customers, members, and cameras.
