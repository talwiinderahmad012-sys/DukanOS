# Analytics Documentation

## Metric Definitions
- **Total Sales**: Sum of all `COMPLETED` sale totals within the date range.
- **Gross Profit**: Sum of all line items' `lineProfit` from `COMPLETED` sales.
- **Expenses**: Sum of all expenses within the date range.
- **Net Profit**: Gross Profit - Expenses.
- **Outstanding Udhaar**: Total outstanding amount from all customers.
- **Products Sold**: Sum of all line item quantities from `COMPLETED` sales.
- **Average Order Value**: Total Sales / Order Count.

## Profit Calculation Methodology
Profit is calculated based on historical `SaleItem` snapshots. The `lineProfit` is calculated at the time of sale using the item's purchase price at that exact moment. It does NOT use the current `purchasePrice` of the product, ensuring historical accuracy even if product costs change.

## Cancelled Transaction Handling
Cancelled sales are strictly excluded from all KPI calculations. When a sale is cancelled, its status changes to `CANCELLED`, and it is filtered out of all analytics queries (which explicitly use `status: SaleStatus.COMPLETED`).

## Business Health Score
The score is out of 100, composed of 6 weighted dimensions:
1. **Sales Growth** (25%): Month-over-month revenue growth.
2. **Profitability** (25%): Gross profit margin percentage.
3. **Inventory Health** (20%): Ratio of out-of-stock and low-stock items.
4. **Udhaar Health** (15%): Outstanding credit vs monthly revenue.
5. **Expense Control** (10%): Expenses relative to revenue.
6. **Customer Growth** (5%): Acquisition of new customers.

Status thresholds:
- 80-100: Excellent
- 60-80: Healthy
- 40-60: Needs Attention
- 0-40: Critical

## Insight Generation Rules
Insights are generated dynamically based on real data deviations. Examples include:
- High Priority: Significant sales drop, critical low stock.
- Medium Priority: Rising expenses, increasing Udhaar.
- Low Priority: New customer milestones, top selling products.
Max 8 insights are shown to avoid overwhelming the user.

## Inventory Valuation Method
Inventory valuation uses the `LATEST_COST` method. The total value is calculated by multiplying each product's `currentStock` by its current `purchasePrice`. It is clearly labeled as an estimate based on latest costs.

## Branch Aggregation
When `branchId` is provided, analytics are filtered to that specific branch. Otherwise, they aggregate across the entire business.

## Date/Timezone Rules
All date ranges are generated using the user's specific business timezone. Queries use exact timestamp boundaries to ensure accurate reporting regardless of server time.

## Step 31: Advanced Analytics Architecture

### Analytics Pages
- `/dashboard/analytics` — Main dashboard with KPIs, trends, monthly growth, yearly comparison, top products, slow/dead stock, low stock, top customers, Udhaar, purchases, branches, inventory valuation, health score, and insights.
- `/dashboard/analytics/sales` — Dedicated sales analytics with payment method breakdown, category breakdown, and top products by revenue.
- `/dashboard/analytics/products` — Product performance with top sellers, best profit products, slow-moving stock, and declining products.
- `/dashboard/analytics/inventory` — Inventory valuation, stock status, slow-moving stock, and dead stock.
- `/dashboard/analytics/customers` — Customer analytics with top customers, new customer growth, Udhaar, and credit recovery.
- `/dashboard/analytics/purchases` — Purchase analytics with spend trends and top suppliers.
- `/dashboard/analytics/expenses` — Expense analytics with category breakdown.
- `/dashboard/analytics/branches` — Branch performance comparison.

### Declining Products
Products are flagged as declining when current period revenue drops by ≥15% compared with the previous equivalent period. The threshold is configurable and documented.

### Best Profit Products
Ranked by actual historical `lineProfit` from `SaleItem` snapshots, not recalculated from current costs.

### Expense Analytics
Expenses are grouped by category and compared with the previous period. Total growth is calculated using the same `calculateGrowth` utility.

### Employee/Payroll Analytics
Aggregated payroll data (total, paid, pending, employee count, leave usage) is shown on the main analytics page. Individual salary details remain private and permission-protected.

### Export Functionality
- CSV export is available via the `ExportButton` client component.
- Print-friendly layout is supported via `window.print()`.
- Exports respect the selected date range and business context.

### Security & Tenant Isolation
- Every analytics query derives `businessId` from the authenticated session.
- `EMPLOYEE` role is redirected away from analytics pages.
- `MANAGER` role can be extended with `branchId` filtering.
- Server-side authorization is enforced on all analytics server actions.

### Performance
- All analytics use database-level `aggregate`, `groupBy`, and filtered queries.
- No raw financial records are sent to client components.
- Parallel `Promise.all` is used extensively to minimize query time.

### Testing
Analytics integration tests are located at `src/scripts/test_analytics_step31.ts`. Tests cover:
1. Tenant isolation
2. Branch isolation
3. Date range filtering
4. Sales totals
5. Profit totals
6. Historical cost snapshot usage
7. Cancelled sale exclusion
8. Purchase totals
9. Cancelled purchase exclusion
10. Udhaar totals
11. Customer ranking
12. Product ranking
13. Slow-moving products
14. Expense calculations
15. Payroll integration
16. MoM growth
17. YoY growth
18. Zero previous-period growth
19. Empty data handling
20. Declining products logic
21. Best profit products logic
22. Sales by payment method
23. Sales by category
24. Business health data
25. Business insights data
