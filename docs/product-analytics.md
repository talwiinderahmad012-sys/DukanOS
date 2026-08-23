# DukaanOS — Product Analytics & Usage Telemetry (Step 23)

## 1. Privacy-First Principles
Product analytics in DukaanOS is built to understand how the software is used and where onboarding or reliability issues occur, without inspecting private store numbers or spying on users.

### Strictly Excluded Fields:
- Customer names, phone numbers, or residential addresses
- Individual employee salaries, attendance notes, or leaves
- Customer credit (Udhaar) debt balances
- Product wholesale purchase costs, selling prices, or profit margins
- Individual invoice totals, item names, or discounts
- CCTV RTSP video streams or credentials
- SMS/WhatsApp communication message bodies
- Passwords, API tokens, and session tokens

All metadata is validated against an allowlist and filtered using `sanitizeAnalyticsMetadata()`.

---

## 2. Event Registry

| Event Name | Category | Idempotent | Description |
|---|---|:---:|---|
| `SIGNUP_STARTED` | Growth | ❌ | User visited `/register` |
| `SIGNUP_COMPLETED` | Growth | ❌ | New user account created |
| `BUSINESS_CREATED` | Tenancy | ❌ | First or additional business profile registered |
| `ONBOARDING_COMPLETED` | Onboarding | ✅ | All 5 initial store setup tasks finished |
| `PRODUCT_CREATED` | Inventory | ❌ | Product added to store catalog |
| `PURCHASE_CREATED` | Procurement | ❌ | Wholesale supplier purchase order logged |
| `FIRST_SALE_COMPLETED` | Activation | ✅ | First POS transaction tendered (Activates Store) |
| `CUSTOMER_CREATED` | Customers | ❌ | Regular customer profile added |
| `CUSTOMER_PAYMENT_RECORDED` | Finance | ❌ | Udhaar debt installment collected |
| `PWA_INSTALLED` | Platform | ❌ | App installed on desktop or mobile |
| `OFFLINE_MODE_USED` | Resilience | ❌ | Counter checkout in offline status |
| `OFFLINE_SYNC_COMPLETED` | Resilience | ❌ | Offline transaction batch synced to server |
| `POS_CHECKOUT_FAILED` | Reliability | ❌ | POS checkout transaction error |
| `OFFLINE_SYNC_CONFLICT` | Reliability | ❌ | Re-synchronization conflict detected |

---

## 3. Activation Definition & Funnel

> **Activated Store Definition**: A store is activated when a user registers, creates their business profile, adds a product, and rings up their **first successful POS sale** (`COMPLETED`).

### Funnel Stages:
1. User Signup
2. Business Profile Created
3. First Product Added
4. First Stock Purchase
5. First POS Sale (Activated)

---

## 4. Product Health Score Methodology

The **Product Health Score (0-100)** is a weighted composite indicator:

$$\text{Health Score} = \text{Activation (30)} + \text{7-Day Retention (25)} + \text{Reliability (25)} + \text{Bug Health (20)}$$

- **Activation Score (30 pts)**: Ratio of signups to activated stores (target $\ge 40\%$).
- **7-Day Retention Score (25 pts)**: Ratio of active stores with transactions in last 7 days (target $\ge 50\%$).
- **System Reliability Score (25 pts)**: Ratio of successful POS checkouts vs failures (target $\ge 99\%$).
- **Bug Severity Score (20 pts)**: $20 - (5 \times \text{Open } P0/P1 \text{ Bugs})$.
