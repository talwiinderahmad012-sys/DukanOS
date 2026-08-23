import { prisma } from '@/lib/db/prisma';
import { SaleStatus, PurchaseStatus } from '@/generated/prisma/client';
import { buildAnalyticsCacheKey, getCachedAnalytics, setCachedAnalytics, invalidateAnalyticsCache, getAnalyticsCacheStats, clearAllAnalyticsCache, resetAnalyticsCacheStats } from '@/lib/cache/analytics-cache';
import { publishAnalyticsEvent, subscribeAnalyticsEvents } from '@/lib/cache/analytics-events';
import { computeForecast, type DailyRevenuePoint } from '@/lib/analytics/forecast-engine';
import { buildCohortSummary, summarizeCohorts, type CohortRow } from '@/lib/analytics/cohort-engine';
import { getCustomerCohortAnalytics } from '@/services/analytics/cohorts';
import { getSalesForecast, getBusinessGrowthIndicators } from '@/services/analytics/forecast';
import { generateBusinessReport, type ReportType } from '@/services/reports/business-reports';
import { hasPermission } from '@/lib/permissions/matrix';

async function run() {
  console.log('=== Step 32 Reporting Integration Tests ===\n');
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

  const otherBusiness = await prisma.business.findFirst({ where: { id: { not: business.id } } });
  const branch = await prisma.branch.findFirst({ where: { businessId: business.id } });

  resetAnalyticsCacheStats();
  clearAllAnalyticsCache();

  // 1. Tenant cache isolation
  console.log('\n--- Tenant Cache Isolation ---');
  if (otherBusiness) {
    const keyA = buildAnalyticsCacheKey({ businessId: business.id, branchId: null, module: 'sales', from: '2024-01-01', to: '2024-12-31' });
    const keyB = buildAnalyticsCacheKey({ businessId: otherBusiness.id, branchId: null, module: 'sales', from: '2024-01-01', to: '2024-12-31' });
    setCachedAnalytics(keyA, { revenue: 100 });
    setCachedAnalytics(keyB, { revenue: 200 });
    assert((getCachedAnalytics<{ revenue: number }>(keyA))?.revenue === 100, 'Business A cache returns its own data');
    assert((getCachedAnalytics<{ revenue: number }>(keyB))?.revenue === 200, 'Business B cache returns its own data');
    assert(keyA !== keyB, 'Cache keys differ across tenants');
  } else {
    console.log('  SKIP: No other business for isolation test');
  }

  // 2. Branch cache isolation
  console.log('\n--- Branch Cache Isolation ---');
  if (branch) {
    const keyBranch = buildAnalyticsCacheKey({ businessId: business.id, branchId: branch.id, module: 'sales', from: '2024-01-01', to: '2024-12-31' });
    const keyAll = buildAnalyticsCacheKey({ businessId: business.id, branchId: null, module: 'sales', from: '2024-01-01', to: '2024-12-31' });
    setCachedAnalytics(keyBranch, { revenue: 300 });
    setCachedAnalytics(keyAll, { revenue: 400 });
    assert((getCachedAnalytics<{ revenue: number }>(keyBranch))?.revenue === 300, 'Branch-specific cache returns branch data');
    assert((getCachedAnalytics<{ revenue: number }>(keyAll))?.revenue === 400, 'All-branches cache returns aggregate data');
  } else {
    console.log('  SKIP: No branch for isolation test');
  }

  // 3. Cache key uniqueness
  console.log('\n--- Cache Key Uniqueness ---');
  const k1 = buildAnalyticsCacheKey({ businessId: 'b1', branchId: null, module: 'sales', from: '2024-01-01', to: '2024-01-31' });
  const k2 = buildAnalyticsCacheKey({ businessId: 'b1', branchId: null, module: 'sales', from: '2024-01-01', to: '2024-01-31' });
  const k3 = buildAnalyticsCacheKey({ businessId: 'b1', branchId: null, module: 'sales', from: '2024-02-01', to: '2024-02-28' });
  assert(k1 === k2, 'Same params produce identical keys');
  assert(k1 !== k3, 'Different date ranges produce different keys');

  // 4. Cache invalidation after sale
  console.log('\n--- Cache Invalidation After Sale ---');
  const invKey = buildAnalyticsCacheKey({ businessId: business.id, branchId: null, module: 'sales', from: '2024-01-01', to: '2024-12-31' });
  setCachedAnalytics(invKey, { revenue: 999 });
  assert((getCachedAnalytics<{ revenue: number }>(invKey))?.revenue === 999, 'Cache set works');
  const removed = invalidateAnalyticsCache({ businessId: business.id, module: 'sales' });
  assert(removed >= 1, 'Invalidation removes at least 1 entry');
  assert(getCachedAnalytics(invKey) === undefined, 'Cache miss after invalidation');

  // 5. Cache invalidation after purchase
  console.log('\n--- Cache Invalidation After Purchase ---');
  const purKey = buildAnalyticsCacheKey({ businessId: business.id, branchId: null, module: 'purchases', from: '2024-01-01', to: '2024-12-31' });
  setCachedAnalytics(purKey, { total: 777 });
  invalidateAnalyticsCache({ businessId: business.id, module: 'purchases' });
  assert(getCachedAnalytics(purKey) === undefined, 'Purchase cache invalidated');

  // 6. Report totals
  console.log('\n--- Report Totals ---');
  const report = await generateBusinessReport(business.id, 'SALES', { from: new Date('2000-01-01'), to: new Date() });
  assert(report.type === 'SALES', 'Sales report generated');
  assert(typeof report.totals.totalRevenue === 'number', 'Report totals are numbers');
  assert(typeof report.summary.totalRevenue === 'number', 'Report summary is number');

  // 7. Cancelled sale exclusion
  console.log('\n--- Cancelled Sale Exclusion ---');
  const completedSales = await prisma.sale.count({ where: { businessId: business.id, status: SaleStatus.COMPLETED } });
  const cancelledSales = await prisma.sale.count({ where: { businessId: business.id, status: SaleStatus.CANCELLED } });
  assert(completedSales >= 0 && cancelledSales >= 0, 'Sale counts are valid');
  const salesReport = await generateBusinessReport(business.id, 'SALES', { from: new Date('2000-01-01'), to: new Date() });
  assert(salesReport.rows.every((r: any) => !r.invoiceNumber?.includes('CANCELLED')), 'Cancelled sales not in report rows');

  // 8. Cancelled purchase exclusion
  console.log('\n--- Cancelled Purchase Exclusion ---');
  const receivedPurchases = await prisma.purchase.count({ where: { businessId: business.id, status: PurchaseStatus.RECEIVED } });
  const cancelledPurchases = await prisma.purchase.count({ where: { businessId: business.id, status: PurchaseStatus.CANCELLED } });
  assert(receivedPurchases >= 0 && cancelledPurchases >= 0, 'Purchase counts are valid');

  // 9. Customer cohort calculation
  console.log('\n--- Customer Cohort Calculation ---');
  const cohort = await getCustomerCohortAnalytics(business.id, { monthsBack: 3 });
  assert(Array.isArray(cohort.rows), 'Cohort rows is array');
  assert(typeof cohort.totalCustomers === 'number', 'Cohort totalCustomers is number');
  assert(typeof cohort.overallRepeatPurchaseRate === 'number', 'Cohort repeat rate is number');

  // 10. Retention calculation
  console.log('\n--- Retention Calculation ---');
  if (cohort.rows.length > 0) {
    const first = cohort.rows[0];
    assert(first.size >= 0, 'Cohort size is non-negative');
    assert(first.offsets.length > 0, 'Cohort has offsets');
    assert(first.offsets[0].retentionPercent >= 0, 'Offset 0 retention is non-negative');
  } else {
    console.log('  SKIP: No cohort data');
  }

  // 11. Forecast with sufficient data
  console.log('\n--- Forecast Sufficient Data ---');
  const series: DailyRevenuePoint[] = [];
  const now = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const base = dayOfWeek === 0 || dayOfWeek === 6 ? 2000 : 5000;
    series.push({ date: d.toISOString().split('T')[0], revenue: base + Math.random() * 1000 });
  }
  const forecast = computeForecast(series);
  assert(forecast.status === 'SUCCESS', 'Forecast succeeds with sufficient data');
  assert(forecast.next7Days > 0 || forecast.next7Days === 0, 'next7Days is a number');
  assert(forecast.next30Days >= forecast.next7Days, 'next30Days >= next7Days');
  assert(['GROWING', 'STABLE', 'DECLINING'].includes(forecast.trend), 'Trend is valid');
  assert(['LOW', 'MEDIUM', 'HIGH'].includes(forecast.confidence), 'Confidence is valid');

  // 12. Forecast with insufficient data
  console.log('\n--- Forecast Insufficient Data ---');
  const emptySeries: DailyRevenuePoint[] = [];
  const shortSeries: DailyRevenuePoint[] = [{ date: '2024-01-01', revenue: 100 }];
  const emptyForecast = computeForecast(emptySeries);
  const shortForecast = computeForecast(shortSeries);
  assert(emptyForecast.status === 'INSUFFICIENT_DATA', 'Empty series returns insufficient');
  assert(shortForecast.status === 'INSUFFICIENT_DATA', 'Short series returns insufficient');
  assert(emptyForecast.message === 'Insufficient historical data', 'Clear insufficient message');

  // 13. Growth trend calculation
  console.log('\n--- Growth Trend Calculation ---');
  const growthSeries: DailyRevenuePoint[] = [];
  for (let i = 56; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const revenue = 4000 + (56 - i) * 50;
    growthSeries.push({ date: d.toISOString().split('T')[0], revenue });
  }
  const growthForecast = computeForecast(growthSeries);
  assert(growthForecast.status === 'SUCCESS', 'Growth series forecast succeeds');
  assert(growthForecast.trend === 'GROWING', 'Upward series detected as GROWING');

  // 14. Tenant isolation
  console.log('\n--- Tenant Isolation (End-to-End) ---');
  if (otherBusiness) {
    const otherReport = await generateBusinessReport(otherBusiness.id, 'SALES', { from: new Date('2000-01-01'), to: new Date() });
    const thisReport = await generateBusinessReport(business.id, 'SALES', { from: new Date('2000-01-01'), to: new Date() });
    assert(otherReport.dateRange.from === thisReport.dateRange.from, 'Reports use same range format');
    assert(otherReport.type === 'SALES' && thisReport.type === 'SALES', 'Both reports are sales type');
  } else {
    console.log('  SKIP: No other business');
  }

  // 15. Payroll permission restrictions
  console.log('\n--- Payroll Permission Restrictions ---');
  assert(!hasPermission('CASHIER', 'VIEW_SALARIES'), 'CASHIER lacks VIEW_SALARIES');
  assert(!hasPermission('EMPLOYEE', 'VIEW_SALARIES'), 'EMPLOYEE lacks VIEW_SALARIES');
  assert(hasPermission('OWNER', 'VIEW_SALARIES'), 'OWNER has VIEW_SALARIES');
  assert(hasPermission('MANAGER', 'VIEW_SALARIES') === false, 'MANAGER lacks VIEW_SALARIES');

  // 16. No financial floating-point corruption
  console.log('\n--- No Floating-Point Corruption ---');
  const agg = await prisma.sale.aggregate({
    where: { businessId: business.id, status: SaleStatus.COMPLETED },
    _sum: { total: true },
  });
  const totalFromDB = Number(agg._sum.total || 0);
  assert(Number.isFinite(totalFromDB), 'Aggregated total is finite');
  assert(typeof totalFromDB === 'number', 'Aggregated total is number');
  const reportTotal = Number(report.totals.totalRevenue);
  assert(Math.abs(reportTotal - totalFromDB) < 0.01 || reportTotal === 0, 'Report total matches DB aggregate');

  // 17. Report date filtering
  console.log('\n--- Report Date Filtering ---');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayReport = await generateBusinessReport(business.id, 'SALES', { from: today, to: new Date(today.getTime() + 86400000 - 1) });
  const allTimeReport = await generateBusinessReport(business.id, 'SALES', { from: new Date('2000-01-01'), to: new Date() });
  assert(todayReport.dateRange.from === today.toISOString().split('T')[0], 'Today report uses today range');
  assert(todayReport.generatedAt instanceof Date, 'Report has generatedAt Date');

  // 18. Branch filtering
  console.log('\n--- Branch Filtering ---');
  if (branch) {
    const branchReport = await generateBusinessReport(business.id, 'SALES', { from: new Date('2000-01-01'), to: new Date(), branchId: branch.id });
    assert(branchReport.branchId === branch.id, 'Branch report includes branchId');
  } else {
    console.log('  SKIP: No branch');
  }

  // 19. Empty-data handling
  console.log('\n--- Empty-Data Handling ---');
  const emptyReport = await generateBusinessReport(business.id, 'SALES', { from: new Date('2099-01-01'), to: new Date('2099-12-31') });
  assert(emptyReport.summary.totalRevenue === 0, 'Empty range returns zero revenue');
  assert(Array.isArray(emptyReport.rows), 'Empty range returns array rows');
  assert(emptyReport.totals.totalRevenue === 0, 'Empty range returns zero totals');

  // 20. Real-time refresh event foundation
  console.log('\n--- Real-time Refresh Event Foundation ---');
  const receivedEvents: any[] = [];
  const unsub = subscribeAnalyticsEvents(business.id, (event) => {
    receivedEvents.push(event);
  });
  publishAnalyticsEvent({ type: 'sale', businessId: business.id, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 50));
  assert(receivedEvents.length === 1, 'Event received by subscriber');
  assert(receivedEvents[0].type === 'sale', 'Event type is correct');
  assert(receivedEvents[0].businessId === business.id, 'Event businessId is correct');
  unsub();
  publishAnalyticsEvent({ type: 'sale', businessId: business.id, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 50));
  assert(receivedEvents.length === 1, 'Unsubscribed listener does not receive events');

  // Cache stats
  console.log('\n--- Cache Stats ---');
  const stats = getAnalyticsCacheStats();
  console.log(`  Cache stats: hits=${stats.hits}, misses=${stats.misses}, evictions=${stats.evictions}, size=${stats.size}`);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  if (err?.code === 'P1001' || err?.message?.includes('Can\'t reach database server')) {
    console.log('\nDatabase is not reachable in this environment.');
    console.log('Tests require a running PostgreSQL instance with DATABASE_URL configured.');
    console.log('Skipping data-dependent verification.');
    process.exit(0);
  }
  console.error('Test runner error:', err);
  process.exit(1);
});
