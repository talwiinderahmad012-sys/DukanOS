# DukaanOS — Customer Experience, Feedback & Loyalty Foundation (Step 11)

## Overview
The Customer Experience & Feedback module equips DukaanOS store owners with direct visibility into customer satisfaction, repeat purchase frequency, average order values, and feedback resolution workflows.

---

## Key Architecture Components

### 1. Factual Customer Insights & Profile Hub
Located at `/dashboard/customers/[id]` with 5 interactive tabs:
- **Overview & Insights**:
  - Lifetime Spend (Rs.)
  - Total Completed Purchases (cancelled invoices strictly excluded)
  - Average Order Value (AOV)
  - Purchase Frequency (Average days between visits)
  - Favorite / Top 5 Purchased Products
  - Customer Feedback & Average Rating Summary
- **Purchases**: Historical invoice list with direct links to `/dashboard/sales/[id]`.
- **Khata Ledger**: Step 8 chronological unified debit/credit running balance.
- **Feedback**: Reviews submitted by this customer with status and resolution notes.
- **Activity & Audit**: Customer profile audit log.

### 2. Feedback System & Rating Mechanics
- **Star Rating**: 1 to 5 stars (integer values).
- **Categories**:
  - `SERVICE` (Store Service)
  - `PRODUCT` (Product Quality)
  - `PRICE` (Pricing & Value)
  - `STAFF` (Staff Behavior)
  - `CLEANLINESS` (Store Cleanliness)
  - `DELIVERY` (Order & Packaging)
  - `OTHER` (General)
- **Status Lifecycle**:
  - `NEW`: Newly submitted review awaiting store management attention.
  - `REVIEWING`: Manager is investigating or contacting the customer.
  - `RESOLVED`: Handled with internal manager resolution note.
  - `ARCHIVED`: Closed.

### 3. Public Mobile Token Verification & Security
- **Route**: `/feedback/[token]`
- **Security Safeguards**:
  - 32-character cryptographically secure token (`crypto.randomBytes(16).toString('hex')`).
  - Tokens expire after 30 days.
  - Strictly single-use: once submitted, `usedAt` timestamp is recorded and subsequent submissions are blocked with an informative message.
  - Public verification only displays the business name, customer first name (optional), and invoice number. Financial balances, credit debts, or internal employee records are never leaked.
- **Anonymous Reviews**: Supports submitting reviews anonymously without linking customer record identity.

### 4. Low-Rating Alerts & Notification Triggers
When a customer submits a rating $\le 2$ stars:
- Automatically creates an `ALERT` (1 star) or `WARNING` (2 stars) `Notification` for store owners and managers.
- Deduplication key: `${businessId}-FEEDBACK-${feedbackId}`.

---

## Domain Services
- `src/services/customer-insights.ts`: `getCustomerInsights(businessId, customerId)`.
- `src/services/feedback.ts`:
  - `generateFeedbackInviteToken(businessId, options)`
  - `verifyFeedbackToken(token)`
  - `submitCustomerFeedback(token, data)`
  - `getFeedbackDashboardStats(businessId)`
  - `listBusinessFeedback(businessId, options)`
  - `resolveFeedback(businessId, userId, feedbackId, status, resolutionNote)`
- `src/services/customers.ts`: Customer CRUD, status transitions (`ACTIVE`, `INACTIVE`, `ARCHIVED`), and pagination.

---

## Verification
- Automated integration test suite: `src/scripts/test_customer_feedback.ts` (7 automated tests passing).
- Production build: `npm run build` (28 Next.js routes compiled cleanly).
