# DukaanOS — SaaS Plans & Billing Foundation (Step 24)

## 1. Commercial Philosophy: Free-First Guarantee

DukaanOS is engineered to be **100% free-first** for small retail shops and general stores.

### Fundamental Guarantees:
- **No Paywalls**: All core MVP functionality (POS counter, catalog, inventory, supplier purchases, customer khata, debt ledgers, financial reports, business advisor, staff attendance/payroll, multi-branch, PWA, offline mode) is unlocked under the standard **`FREE`** plan.
- **No Payment Gateways**: Stripe, PayPal, card forms, and recurring billing schedulers are deliberately omitted in this phase.
- **No Artificial Crippling**: Quota limits for the `FREE` plan are set to `-1` (`Unlimited`), allowing stores to run without arbitrary hurdles.
- **Forward-Compatible Architecture**: The plan and subscription data model allows commercial tiers (`PRO`, `BUSINESS`, `ENTERPRISE`) to be introduced in the future without schema overhauls.

---

## 2. Plan Data Model

```text
Plan (1) ───< PlanFeature (N)
Plan (1) ───< PlanLimit (N)
Plan (1) ───< BusinessSubscription (N) >─── (1) Business
Business (1) ───< BusinessEntitlement (N) [Overrides]
```

### Entity Schema:
- **`Plan`**: Tier container (`FREE`, `PRO`, `BUSINESS`) with `name`, `description`, `isActive`, and `displayOrder`.
- **`PlanFeature`**: Feature flag mappings (`featureKey`, `isEnabled`).
- **`PlanLimit`**: Resource quotas (`limitKey`, `limitValue`: `-1` = unlimited).
- **`BusinessSubscription`**: Maps a store `Business` to an active `Plan` with lifecycle status (`ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELLED`, `EXPIRED`).
- **`BusinessEntitlement`**: Store-specific grant or restriction overrides taking precedence over base plan rules.

---

## 3. Automatic Atomic Free Plan Defaulting

When a new store is created via `createBusinessForUser()`:
1. `ensureDefaultFreePlan()` ensures the `FREE` plan, all 17 standard features, and 7 standard limits exist in the database.
2. Inside the database transaction, a `BusinessSubscription` is created with `status: 'ACTIVE'`.
3. If store creation encounters any failure, plan assignment rolls back atomically.

---

## 4. UI Settings & Dashboards

- **`/dashboard/settings/plan`**: Store plan overview, tier badge, and complete list of active capabilities.
- **`/dashboard/settings/usage`**: Real-time database utilization counters for Products, Customers, Branches, Staff, and Monthly Invoices with `Unlimited` indicator.
- **`/dashboard/platform/plans`**: Platform administration portal restricted to platform administrators for inspecting tiers and feature flags.
