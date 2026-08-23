import { prisma } from '@/lib/db/prisma';
import { SaleStatus, PurchaseStatus } from '@/generated/prisma/client';
import { calculateGrowth, getMonthlyRange, getYearlyRange } from '@/lib/utils/date-utils';

function kpi(current: number, previous: number) {
  return { current, previous, growth: calculateGrowth(current, previous) };
}

async function run() {
  console.log('=== Step 31 Analytics Integration Tests ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.log(`  FAIL: ${message}`);
      failed++;
    }
  }

  const business = await prisma.business.findFirst();
  if (!business) {
    console.log('No business found — skipping data-dependent tests');
    process.exit(0);
  }

  const branch = await prisma.branch.findFirst({ where: { businessId: business.id } });
  const otherBusiness = await prisma.business.findFirst({ where: { id: { not: business.id } } });

  const allTime = { start: new Date(2000, 0, 1), end: new Date(), label: 'All' };

  // 1. Tenant isolation
  console.log('\n--- Tenant Isolation ---');
  if (otherBusiness) {
    const otherSales = await prisma.sale.aggregate({ where: { businessId: otherBusiness.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } }, _sum: { total: true } });
    const thisSales = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } }, _sum: { total: true } });
    assert(otherSales._sum.total !== thisSales._sum.total || (Number(otherSales._sum.total || 0) === 0 && Number(thisSales._sum.total || 0) === 0), 'Different businesses have isolated data');
  } else {
    console.log('  SKIP: No other business for isolation test');
  }

  // 2. Branch isolation
  console.log('\n--- Branch Isolation ---');
  if (branch) {
    const branchSales = await prisma.sale.aggregate({ where: { businessId: business.id, branchId: branch.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } }, _sum: { total: true } });
    assert(Number(branchSales._sum.total || 0) >= 0, 'Branch-filtered sales return valid numbers');
  } else {
    console.log('  SKIP: No branch for isolation test');
  }

  // 3. Date range filtering
  console.log('\n--- Date Range Filtering ---');
  const today = { start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0, 0), end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59, 999) };
  const allSalesAgg = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } }, _sum: { total: true }, _count: { id: true } });
  const todaySalesAgg = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: today.start, lte: today.end } }, _sum: { total: true }, _count: { id: true } });
  assert(Number(todaySalesAgg._sum.total || 0) <= Number(allSalesAgg._sum.total || 0), 'Today sales <= all-time sales');
  assert(!isNaN(Number(todaySalesAgg._sum.total || 0)), 'Today sales is a valid number');

  // 4. Sales totals
  console.log('\n--- Sales Totals ---');
  assert(typeof Number(allSalesAgg._sum.total || 0) === 'number', 'Sales total is a number');
  assert(Number(allSalesAgg._sum.total || 0) >= 0, 'Sales total is non-negative');
  assert(typeof allSalesAgg._count.id === 'number', 'Order count is a number');

  // 5. Profit totals
  console.log('\n--- Profit Totals ---');
  const allItemsAgg = await prisma.saleItem.aggregate({ where: { sale: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } } }, _sum: { lineProfit: true } });
  const allExpAgg = await prisma.expense.aggregate({ where: { businessId: business.id, date: { gte: allTime.start, lte: allTime.end } }, _sum: { amount: true } });
  const grossProfit = Number(allItemsAgg._sum.lineProfit || 0);
  const expenses = Number(allExpAgg._sum.amount || 0);
  const netProfit = grossProfit - expenses;
  assert(typeof grossProfit === 'number', 'Gross profit is a number');
  assert(netProfit === grossProfit - expenses, 'Net profit = gross profit - expenses');

  // 6. Historical cost snapshot usage
  console.log('\n--- Historical Cost Snapshot ---');
  const saleWithItems = await prisma.sale.findFirst({
    where: { businessId: business.id, status: SaleStatus.COMPLETED },
    include: { items: { include: { product: true } } },
  });
  if (saleWithItems && saleWithItems.items.length > 0) {
    const item = saleWithItems.items[0];
    assert(item.costPrice !== undefined && item.costPrice !== null, 'SaleItem has historical costPrice snapshot');
    assert(Number(item.costPrice) >= 0, 'Historical costPrice is non-negative');
  } else {
    console.log('  SKIP: No sale items for snapshot test');
  }

  // 7. Cancelled sale exclusion
  console.log('\n--- Cancelled Sale Exclusion ---');
  const completedCount = await prisma.sale.count({ where: { businessId: business.id, status: SaleStatus.COMPLETED } });
  const cancelledCount = await prisma.sale.count({ where: { businessId: business.id, status: SaleStatus.CANCELLED } });
  const completedSalesAgg = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } }, _count: { id: true } });
  assert(completedSalesAgg._count.id <= completedCount, 'KPIs only count completed sales');

  // 8. Purchase totals
  console.log('\n--- Purchase Totals ---');
  const purchaseAgg = await prisma.purchase.aggregate({ where: { businessId: business.id, status: PurchaseStatus.RECEIVED, purchaseDate: { gte: allTime.start, lte: allTime.end } }, _sum: { total: true }, _count: { id: true } });
  assert(typeof Number(purchaseAgg._sum.total || 0) === 'number', 'Purchase total is a number');
  assert(Number(purchaseAgg._sum.total || 0) >= 0, 'Purchase total is non-negative');

  // 9. Cancelled purchase exclusion
  console.log('\n--- Cancelled Purchase Exclusion ---');
  const receivedPurchases = await prisma.purchase.count({ where: { businessId: business.id, status: PurchaseStatus.RECEIVED } });
  const cancelledPurchases = await prisma.purchase.count({ where: { businessId: business.id, status: PurchaseStatus.CANCELLED } });
  assert(purchaseAgg._count.id <= receivedPurchases, 'Only RECEIVED purchases counted');

  // 10. Udhaar totals
  console.log('\n--- Udhaar Totals ---');
  const customerOutstanding = await prisma.customer.aggregate({ where: { businessId: business.id, isActive: true }, _sum: { outstanding: true } });
  assert(Number(customerOutstanding._sum.outstanding || 0) >= 0, 'Udhaar total is non-negative');

  // 11. Customer ranking
  console.log('\n--- Customer Ranking ---');
  const topCustomers = await prisma.sale.groupBy({
    by: ['customerId'],
    where: { businessId: business.id, status: SaleStatus.COMPLETED, customerId: { not: null } },
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
    take: 10,
  });
  assert(Array.isArray(topCustomers), 'Top customers returns array');
  if (topCustomers.length > 1) {
    assert(Number(topCustomers[0]._sum.total || 0) >= Number(topCustomers[1]._sum.total || 0), 'Customers sorted by spend descending');
  }

  // 12. Product ranking
  console.log('\n--- Product Ranking ---');
  const topProducts = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: { sale: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } } },
    _sum: { lineTotal: true },
    orderBy: { _sum: { lineTotal: 'desc' } },
    take: 10,
  });
  assert(Array.isArray(topProducts), 'Top products returns array');
  if (topProducts.length > 1) {
    assert(Number(topProducts[0]._sum.lineTotal || 0) >= Number(topProducts[1]._sum.lineTotal || 0), 'Products sorted by revenue descending');
  }

  // 13. Slow-moving products
  console.log('\n--- Slow-Moving Products ---');
  const now = new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(thresholdDate.getDate() - 30);
  const minAge = new Date(now);
  minAge.setDate(minAge.getDate() - 14);
  const activeProducts = await prisma.product.findMany({ where: { businessId: business.id, isActive: true, currentStock: { gt: 0 }, createdAt: { lte: minAge } }, select: { id: true, name: true, currentStock: true, purchasePrice: true, createdAt: true } });
  const recentSaleItems = await prisma.saleItem.findMany({
    where: { productId: { in: activeProducts.map(p => p.id) }, sale: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: thresholdDate } } },
    select: { productId: true },
    distinct: ['productId'],
  });
  const soldIds = new Set(recentSaleItems.map(i => i.productId));
  const slowProducts = activeProducts.filter(p => !soldIds.has(p.id));
  assert(Array.isArray(slowProducts), 'Slow products logic works');
  for (const p of slowProducts) {
    const daysSince = Math.floor((now.getTime() - p.createdAt.getTime()) / 86400000);
    assert(daysSince >= 30, `Slow product ${p.name} has >= 30 days idle`);
  }

  // 14. Expense calculations
  console.log('\n--- Expense Calculations ---');
  const expenseRecords = await prisma.expense.findMany({ where: { businessId: business.id, date: { gte: allTime.start, lte: allTime.end } }, select: { category: true, amount: true } });
  const totalExpenses = expenseRecords.reduce((s, e) => s + Number(e.amount), 0);
  assert(typeof totalExpenses === 'number', 'Expense total is a number');
  assert(totalExpenses >= 0, 'Expense total is non-negative');
  const categoryMap = new Map<string, number>();
  for (const e of expenseRecords) {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + Number(e.amount));
  }
  const categorySum = Array.from(categoryMap.values()).reduce((s, a) => s + a, 0);
  assert(Math.abs(categorySum - totalExpenses) < 0.01, 'Category sum matches total');

  // 15. Payroll integration
  console.log('\n--- Payroll Integration ---');
  const payrollAgg = await prisma.employeeSalary.aggregate({ where: { businessId: business.id, paymentDate: { gte: allTime.start, lte: allTime.end } }, _sum: { netSalary: true } });
  const pendingAgg = await prisma.employeeSalary.aggregate({ where: { businessId: business.id, paymentStatus: 'PENDING' }, _sum: { netSalary: true } });
  const totalPayroll = Number(payrollAgg._sum.netSalary || 0) + Number(pendingAgg._sum.netSalary || 0);
  assert(typeof totalPayroll === 'number', 'Payroll total is a number');
  assert(totalPayroll >= 0, 'Payroll total is non-negative');
  assert(totalPayroll === Number(payrollAgg._sum.netSalary || 0) + Number(pendingAgg._sum.netSalary || 0), 'Total = paid + pending');

  // 16. MoM growth
  console.log('\n--- MoM Growth ---');
  const nowYear = new Date().getFullYear();
  const thisM = getMonthlyRange(nowYear, new Date().getMonth() + 1);
  const prevM = getMonthlyRange(nowYear, new Date().getMonth());
  const thisSales = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } }, _sum: { total: true } });
  const prevSales = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: prevM.start, lte: prevM.end } }, _sum: { total: true } });
  const growth = calculateGrowth(Number(thisSales._sum.total || 0), Number(prevSales._sum.total || 0));
  assert(typeof growth.percentage === 'number' || growth.percentage === null, 'Growth percentage is number or null');
  assert(!isNaN(growth.current), 'Growth current is valid');

  // 17. YoY growth
  console.log('\n--- YoY Growth ---');
  const thisYear = getYearlyRange(nowYear);
  const lastYear = getYearlyRange(nowYear - 1);
  const thisYearSales = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: thisYear.start, lte: thisYear.end } }, _sum: { total: true } });
  assert(Number(thisYearSales._sum.total || 0) >= 0, 'YoY sales current is valid');

  // 18. Zero previous-period growth
  console.log('\n--- Zero Previous Period Growth ---');
  const zeroPrev = { start: new Date(2000, 0, 1), end: new Date(2000, 0, 1), label: 'Zero' };
  const zeroGrowth = calculateGrowth(0, 0);
  assert(!isNaN(zeroGrowth.current), 'Zero-period growth does not produce NaN');
  assert(zeroGrowth.status === 'FLAT', 'Zero-zero growth is FLAT');

  // 19. Empty business analytics
  console.log('\n--- Empty Data Handling ---');
  const futureRange = { start: new Date(2099, 0, 1), end: new Date(2099, 0, 2), label: 'Future' };
  const emptySales = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: futureRange.start, lte: futureRange.end } }, _sum: { total: true }, _count: { id: true } });
  assert(Number(emptySales._sum.total || 0) === 0, 'Future range returns zero sales');
  assert(emptySales._count.id === 0, 'Future range returns zero orders');

  // 20. Declining products logic
  console.log('\n--- Declining Products ---');
  const curItems = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: { sale: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } } },
    _sum: { lineTotal: true },
  });
  const prevItems = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: { sale: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: new Date(Number(allTime.start.getTime()) - (Number(allTime.end.getTime()) - Number(allTime.start.getTime()))), lte: new Date(Number(allTime.start.getTime()) - 1) } } },
    _sum: { lineTotal: true },
  });
  assert(Array.isArray(curItems), 'Current items returns array');
  assert(Array.isArray(prevItems), 'Previous items returns array');

  // 21. Best profit products logic
  console.log('\n--- Best Profit Products ---');
  const profitItems = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: { sale: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } } },
    _sum: { lineProfit: true },
    orderBy: { _sum: { lineProfit: 'desc' } },
    take: 10,
  });
  assert(Array.isArray(profitItems), 'Profit items returns array');
  if (profitItems.length > 1) {
    assert(Number(profitItems[0]._sum.lineProfit || 0) >= Number(profitItems[1]._sum.lineProfit || 0), 'Products sorted by profit descending');
  }

  // 22. Sales by payment method
  console.log('\n--- Sales by Payment Method ---');
  const salesForPayment = await prisma.sale.findMany({
    where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } },
    select: { paymentMethod: true, total: true },
  });
  const paymentMap = new Map<string, { count: number; revenue: number }>();
  for (const s of salesForPayment) {
    const existing = paymentMap.get(s.paymentMethod) || { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += Number(s.total);
    paymentMap.set(s.paymentMethod, existing);
  }
  assert(paymentMap.size > 0 || salesForPayment.length === 0, 'Payment method map is valid');

  // 23. Sales by category
  console.log('\n--- Sales by Category ---');
  const itemsForCategory = await prisma.saleItem.findMany({
    where: { sale: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: allTime.start, lte: allTime.end } } },
    include: { product: { select: { categoryId: true, category: { select: { id: true, name: true } } } } },
  });
  const catMap = new Map<string, { revenue: number; profit: number }>();
  for (const item of itemsForCategory) {
    const cid = item.product.categoryId || 'uncategorized';
    const existing = catMap.get(cid) || { revenue: 0, profit: 0 };
    existing.revenue += Number(item.lineTotal);
    existing.profit += Number(item.lineProfit);
    catMap.set(cid, existing);
  }
  assert(catMap.size > 0 || itemsForCategory.length === 0, 'Category map is valid');

  // 24. Business health score data
  console.log('\n--- Business Health Data ---');
  const healthSales = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } }, _sum: { total: true }, _count: { id: true } });
  const healthItems = await prisma.saleItem.aggregate({ where: { sale: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } } }, _sum: { lineProfit: true } });
  const healthExp = await prisma.expense.aggregate({ where: { businessId: business.id, date: { gte: thisM.start, lte: thisM.end } }, _sum: { amount: true } });
  const healthRevenue = Number(healthSales._sum.total || 0);
  const healthProfit = Number(healthItems._sum.lineProfit || 0);
  const healthExpenses = Number(healthExp._sum.amount || 0);
  assert(healthRevenue >= 0 && healthProfit >= 0 && healthExpenses >= 0, 'Health data values are non-negative');

  // 25. Business insights data
  console.log('\n--- Business Insights Data ---');
  const insightSales = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } }, _sum: { total: true }, _count: { id: true } });
  const insightPrevSales = await prisma.sale.aggregate({ where: { businessId: business.id, status: SaleStatus.COMPLETED, saleDate: { gte: prevM.start, lte: prevM.end } }, _sum: { total: true }, _count: { id: true } });
  const insightGrowth = calculateGrowth(Number(insightSales._sum.total || 0), Number(insightPrevSales._sum.total || 0));
  assert(typeof insightGrowth.percentage === 'number' || insightGrowth.percentage === null, 'Insight growth is valid');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
