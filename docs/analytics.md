# DukaanOS — Analytics, Reporting & Business Advisor Specification

This document defines the business intelligence formulas, calculation rules, reporting intervals, deterministic advisor triggers, and health score methodology implemented in Step 9.

---

## 1. Financial Definitions & Accounting Rules

All reports, dashboards, and metrics derive strictly from transactional database models (`Sale`, `SaleItem`, `Purchase`, `Expense`, `Customer`, `CustomerPayment`).

### Gross Revenue
The sum of `Sale.total` for completed sales:
$$\text{Gross Revenue} = \sum_{\text{Sale.status} = \text{COMPLETED}} \text{Sale.total}$$
*Note: Cancelled sales are strictly excluded.*

### Gross Profit
The sum of immutable historical line profits captured in `SaleItem.lineProfit`:
$$\text{Gross Profit} = \sum_{\text{Sale.status} = \text{COMPLETED}} \text{SaleItem.lineProfit}$$
*Note: Includes line-level discounts and proportional allocations of sale-level discounts.*

### Operating Expenses
The sum of all recorded store expenses:
$$\text{Expenses} = \sum \text{Expense.amount}$$

### Net Profit
The net bottom-line earnings retained by the business:
$$\text{Net Profit} = \text{Gross Profit} - \text{Expenses}$$

### Gross Profit Margin
$$\text{Gross Margin \%} = \left(\frac{\text{Gross Profit}}{\text{Gross Revenue}}\right) \times 100$$

### Outstanding Customer Credit (Udhaar)
The current sum of valid customer credit balances:
$$\text{Total Outstanding} = \sum_{\text{Customer.isActive} = \text{true}} \text{Customer.outstanding}$$

---

## 2. Growth Calculation Formula

Growth is evaluated across comparable periods (Day-over-Day, Month-over-Month, Year-over-Year):

$$\text{Growth \%} = \left(\frac{\text{Current} - \text{Previous}}{|\text{Previous}|}\right) \times 100$$

### Zero-Baseline Handling
When the previous period has 0 baseline:
- If current is 0: returns `0.0%` with status `'FLAT'`.
- If current > 0: returns `null` percentage with status `'NO_BASELINE'` (formatted as `"+100% (New)"`) to avoid `Infinity` or `NaN`.

---

## 3. Product Analytics Algorithms

### Top-Selling Products
- Aggregates completed `SaleItem` records within a date interval.
- Groups by `productId` and returns:
  - Quantity sold
  - Total generated revenue
  - Realized gross profit
- Ranked by velocity (quantity sold) descending.

### Slow-Moving Inventory Detection
- Examines active products with `currentStock > 0`.
- Filters out any product with at least 1 completed sale within the last $N$ days (configurable threshold, default = 30 days).
- Computes tied-up working capital:
  $$\text{Tied-up Capital} = \text{currentStock} \times \text{purchasePrice}$$
- Ranked by tied-up capital descending to prioritize high-value dormant inventory.

---

## 4. Deterministic Business Advisor Engine

The Business Advisor operates without paid AI API dependencies, using deterministic transaction evaluation rules:

| Finding Type | Severity | Condition / Trigger Rule | Actionable Advice |
| :--- | :--- | :--- | :--- |
| `OUT_OF_STOCK` | `CRITICAL` | Active product has `currentStock <= 0` | Place urgent purchase order to avoid lost sales |
| `LOW_STOCK` | `WARNING` | Active product has `0 < currentStock <= minStockThreshold` | Restock before inventory depletes |
| `SLOW_MOVING` | `WARNING` | Active stock > 0 with no sales in 30+ days | Bundle or promote items to free tied-up capital |
| `HIGH_DEMAND` | `OPPORTUNITY` | Top product volume $\ge 10$ units sold in period | Increase procurement batch size to avoid stockouts |
| `SALES_DECLINE` | `CRITICAL` | Month-over-Month revenue decline $\le -15\%$ | Review customer traffic, pricing, and stock availability |
| `PROFIT_DECLINE`| `WARNING` | Gross margin contracted by $\ge 5\%$ vs previous period | Audit procurement costs and excessive discounting |
| `CREDIT_RISK` | `CRITICAL` | Outstanding Udhaar $> 35\%$ of monthly revenue | Focus on debt collection before extending new credit |
| `EXPENSE_SPIKE`| `WARNING` | Single category represents $\ge 40\%$ of monthly expenses | Audit utility/operational outlays |

---

## 5. Composite Business Health Score (0–100)

The Business Health Index provides a deterministic composite health score across 5 weighted pillars:

1. **Sales Momentum (25 pts)**:
   - Growth $\ge 15\%$: 25 pts
   - Growth $0\%$ to $15\%$: 22 pts
   - Stable / New: 18 pts
   - Decline $-20\%$ to $0\%$: 14 pts
   - Contraction $< -20\%$: 8 pts

2. **Gross Profit Margin (25 pts)**:
   - Margin $\ge 25\%$: 25 pts
   - Margin $15\%$ to $25\%$: 20 pts
   - Margin $8\%$ to $15\%$: 14 pts
   - Margin $< 8\%$: 6 pts

3. **Inventory Stock Availability (20 pts)**:
   - $0$ out-of-stock items: 20 pts
   - $\le 5\%$ out-of-stock: 16 pts
   - $5\%$ to $15\%$ out-of-stock: 10 pts
   - $> 15\%$ out-of-stock: 4 pts

4. **Credit Risk Control (15 pts)**:
   - Udhaar $\le 15\%$ of monthly sales: 15 pts
   - Udhaar $15\%$ to $35\%$ of monthly sales: 11 pts
   - Udhaar $> 35\%$ of monthly sales: 5 pts

5. **Expense Discipline (15 pts)**:
   - Expenses $\le 25\%$ of gross profit: 15 pts
   - Expenses $25\%$ to $50\%$ of gross profit: 11 pts
   - Expenses $> 50\%$ of gross profit: 5 pts

### Grade Brackets
- **85 – 100**: `EXCELLENT`
- **70 – 84**: `GOOD`
- **50 – 69**: `ATTENTION`
- **< 50**: `CRITICAL`

---

## 6. Owner Notification Deduplication Strategy

To prevent alert flooding, high-priority findings emit owner notifications using a deterministic deduplication key:

$$\text{DeduplicationKey} = \text{businessId} - \text{FindingType} - \text{RelatedEntityId} - \text{PeriodKey}$$

Example:
`biz_123-LOW_STOCK-prod_456-2026-8`

Before creating a notification, the database is queried for an existing matching `deduplicationKey`. If present, the insertion is skipped.
