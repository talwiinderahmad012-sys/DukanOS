# DukaanOS — Feature Flags & Usage Entitlements (Step 24)

## 1. Feature Flag Dictionary

All feature checks in DukaanOS are executed via server-authoritative logic in `src/services/billing/features.ts`:

```typescript
canUseFeature(businessId: string, featureKey: string): Promise<boolean>
```

### Standard Feature Keys (`STANDARD_FEATURES`):

| Feature Key | Module / Capability | Status in FREE Plan |
|---|---|:---:|
| `POS` | Counter billing, barcoding, discounts, split payments | ✅ Enabled |
| `INVENTORY` | Product master, batch tracking, stock adjustments | ✅ Enabled |
| `PURCHASES` | Supplier wholesale procurement orders | ✅ Enabled |
| `CUSTOMERS` | Customer directories and Khata ledgers | ✅ Enabled |
| `UDHAAR` | Credit ledger, overdue tracking, payment recovery | ✅ Enabled |
| `REPORTS` | Daily/Monthly/Yearly P&L, sales, tax reports | ✅ Enabled |
| `BUSINESS_ADVISOR` | AI-powered health score and margin anomaly recommendations | ✅ Enabled |
| `EMPLOYEES` | Staff directory, daily attendance, salary disbursements | ✅ Enabled |
| `OFFLINE_POS` | IndexedDB counter mode with conflict-safe synchronization | ✅ Enabled |
| `PWA` | Installable mobile/desktop Progressive Web App | ✅ Enabled |
| `WEB_PUSH` | Real-time push notifications and operational alerts | ✅ Enabled |
| `MULTI_BRANCH` | Unlimited multi-outlet store management | ✅ Enabled |
| `MULTI_BUSINESS` | Multiple store contexts per user account | ✅ Enabled |
| `CCTV` | Security camera stream and NVR integration | ✅ Enabled |
| `EXTERNAL_COMMUNICATION`| WhatsApp Cloud API & SMS delivery | ✅ Enabled |
| `DATA_EXPORT` | Full store data portability (JSON / CSV) | ✅ Enabled |
| `ADVANCED_ANALYTICS` | Cohort retention, funnel insights, health score | ✅ Enabled |

---

## 2. Resource Limit Dictionary

Limits are tracked via database queries without loading tables into memory:

| Limit Key | Description | Free Plan Quota |
|---|---|:---:|
| `MAX_BRANCHES` | Active store branches | `∞ Unlimited` (`-1`) |
| `MAX_USERS` | Staff team memberships | `∞ Unlimited` (`-1`) |
| `MAX_PRODUCTS` | Active catalog items | `∞ Unlimited` (`-1`) |
| `MAX_CUSTOMERS` | Registered store customers | `∞ Unlimited` (`-1`) |
| `MAX_MONTHLY_SALES` | Completed monthly POS transactions | `∞ Unlimited` (`-1`) |
| `MAX_CCTV_CAMERAS` | Connected IP camera channels | `∞ Unlimited` (`-1`) |
| `MAX_EXTERNAL_MESSAGES`| Delivered WhatsApp/SMS alerts | `∞ Unlimited` (`-1`) |

---

## 3. Entitlement Resolution Precedence

When checking a feature flag or usage limit:

1. **`BusinessEntitlement` Override**: If a specific custom rule is recorded for `businessId`, it takes highest precedence.
2. **`PlanFeature` / `PlanLimit`**: Resolves the rule configured on the active `Plan` attached to `BusinessSubscription`.
3. **Default `FREE` Fallback**: If no subscription is found, falls back safely to the standard free tier defaults.
