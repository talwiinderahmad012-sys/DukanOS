# DukaanOS — Real-World Pilot Feedback & Confusion Log (Step 21)

This log documents user experience findings, confusion points, and observations collected during the real-world retail pilot simulation of **Madina Karyana & General Store** (Layyah/Multan).

---

## 1. Pilot Summary

- **Business Type**: Karyana & General Store (Retail).
- **Environment**: 40 products, 10 suppliers, 15 customers, 2 branch staff.
- **Transactions Tested**: 10 bulk procurements, 30 retail POS sales (cash, credit/udhaar, split), 5 debt recovery installments, 2 staff attendance logs, 1 customer feedback rating.

---

## 2. Issues & Confusion Matrix

| # | Problem | Area | User Expectation | Actual Behavior | Severity | Recommended Fix | Status |
|---|---|---|---|---|---|---|---|
| **1** | Barcode vs SKU in Quick Search | POS Terminal (`/dashboard/pos`) | Expected scanning a barcode without pressing enter to instantly add item to cart | Required manual selection or explicit Enter key | **MEDIUM** | Added automated single-match barcode autofocus listener | ✅ Resolved |
| **2** | Partial Udhaar Payment Tracking | Customers (`/dashboard/customers`) | Expected clear ledger breakdown of individual purchases vs. payments | Ledger showed aggregate outstanding only | **UX** | Added line-item payment ledger history view | ✅ Resolved |
| **3** | Receipt Thermal Font Scaling | Sales Receipts (`/dashboard/sales/[id]`) | Expected 80mm/58mm thermal print styles to auto-trim margins | Margins followed standard desktop A4 defaults | **LOW** | Added `@media print` CSS rules for 58mm/80mm thermal receipts | ✅ Resolved |
| **4** | Concurrent Multi-Cashier Checkout | POS / Inventory | Expected atomic lock when two cashiers sell last items simultaneously | Database rejects second transaction cleanly with `INSUFFICIENT_STOCK` (stock remains 1) | **P0 (Critical)** | Verified SQL conditional row-lock prevents negative stock | ✅ Verified |
| **5** | Low Stock Alert Noise | Business Advisor (`/dashboard/advisor`) | Expected alert only for active items below threshold | Alerted on items with 0 stock that are inactive | **MEDIUM** | Filtered `isActive: true` on low-stock rules | ✅ Resolved |

---

## 3. Severity Classification Summary

- **P0 (Critical — Financial / Security / Integrity)**: 0 Open (100% verified & passing).
- **P1 (High — Core Workflow Blockers)**: 0 Open.
- **P2 (Medium — Workflow Friction / Reporting Clarity)**: 0 Open (Resolved).
- **P3 (Low / UX Polish)**: 0 Open (Resolved).
