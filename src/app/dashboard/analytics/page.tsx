import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import {
  getAnalyticsKPIs,
  getSalesTrend,
  getMonthlyGrowthTable,
  getYearlyComparison,
  getTopProducts,
  getSlowMovingProducts,
  getDeadStock,
  getLowStockSummary,
  getTopCustomers,
  getCustomerGrowth,
  getUdhaarAnalytics,
  getPurchaseAnalytics,
  getBranchAnalytics,
  getInventoryValuation,
  getCurrentMonthPeriods,
  getEmployeePayrollAnalytics,
} from '@/services/analytics';
import { calculateBusinessHealth } from '@/services/analytics/health-score';
import { generateBusinessInsights } from '@/services/analytics/insights';
import { redirect } from 'next/navigation';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { AnalyticsPageClient } from './analytics-page-client';

export default async function AnalyticsPage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  // Analytics exposes revenue/profit/expense metrics. Denied roles render the
  // accessible forbidden state instead of a silent redirect.
  if (!canAccessDashboardPath(membership.role, '/dashboard/analytics')) {
    return <ForbiddenView role={membership.role} />;
  }

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const { period, comparisonPeriod } = getCurrentMonthPeriods();
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const tz = business.timezone || 'Asia/Karachi';

  const [
    kpis,
    trend30,
    monthlyGrowth,
    yearlyComp,
    topProducts,
    slowProducts,
    deadStock,
    lowStock,
    topCustomers,
    customerGrowth,
    udhaar,
    purchaseAnalytics,
    branches,
    inventory,
    health,
    insights,
    payroll,
  ] = await Promise.all([
    getAnalyticsKPIs(business.id, period, comparisonPeriod),
    getSalesTrend(business.id, 30, tz),
    getMonthlyGrowthTable(business.id, now.getFullYear(), tz),
    getYearlyComparison(business.id, tz),
    getTopProducts(business.id, period.start, period.end, 10, 'units'),
    getSlowMovingProducts(business.id, 30, 10),
    getDeadStock(business.id, 90, 10),
    getLowStockSummary(business.id),
    getTopCustomers(business.id, 10, period.start, period.end),
    getCustomerGrowth(business.id, tz),
    getUdhaarAnalytics(business.id, period, tz),
    getPurchaseAnalytics(business.id, period, comparisonPeriod),
    getBranchAnalytics(business.id, yearStart, now),
    getInventoryValuation(business.id),
    calculateBusinessHealth(business.id, tz),
    generateBusinessInsights(business.id, tz),
    getEmployeePayrollAnalytics(business.id, period),
  ]);

  const trendChartData = trend30.slice(-30).map(d => ({
    label: d.date.slice(5),
    value1: d.revenue,
    value2: d.profit,
  }));

  return (
    <AnalyticsPageClient
      year={now.getFullYear()}
      kpis={kpis}
      trendChart={trendChartData}
      monthlyRows={monthlyGrowth.map(m => ({
        month: m.month,
        revenue: m.revenue,
        grossProfit: m.grossProfit,
        expenses: m.expenses,
        netProfit: m.netProfit,
        orders: m.orders,
        avgOrderValue: m.avgOrderValue,
        growthPercent: m.growthPercent,
        growthStatus: m.growthStatus,
      }))}
      yearly={yearlyComp}
      topProducts={topProducts.map(p => ({
        productId: p.productId,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        currentStock: p.currentStock,
        quantitySold: p.quantitySold,
        revenue: p.revenue,
        profit: p.profit,
        profitMarginPercent: p.profitMarginPercent,
      }))}
      slowProducts={slowProducts.map(p => ({
        productId: p.productId,
        name: p.name,
        currentStock: p.currentStock,
        stockValue: p.stockValue,
        daysSinceLastSale: p.daysSinceLastSale,
      }))}
      deadStock={deadStock.map(p => ({
        productId: p.productId,
        name: p.name,
        currentStock: p.currentStock,
        inventoryValue: p.inventoryValue,
        daysSinceLastSale: p.daysSinceLastSale,
      }))}
      lowStock={lowStock}
      topCustomers={topCustomers.map(c => ({
        customerId: c.customerId,
        name: c.name,
        phone: c.phone,
        orderCount: c.orderCount,
        totalSpent: c.totalSpent,
        outstanding: c.outstanding,
      }))}
      customerGrowth={customerGrowth}
      udhaar={udhaar}
      purchaseAnalytics={{
        totalSpend: purchaseAnalytics.totalSpend,
        orderCount: purchaseAnalytics.orderCount,
        topSuppliers: purchaseAnalytics.topSuppliers.map(s => ({
          supplierId: s.supplierId,
          name: s.name,
          totalSpend: s.totalSpend,
          purchaseCount: s.purchaseCount,
        })),
      }}
      branches={branches}
      inventoryValuation={{
        totalUnits: inventory.totalUnits,
        totalValue: inventory.totalValue,
        lowStockValue: inventory.lowStockValue,
        deadStockValue: inventory.deadStockValue,
        note: inventory.note,
      }}
      health={{
        overallScore: health.overallScore,
        status: health.status,
        dimensions: health.dimensions.map(d => ({
          name: d.name,
          score: d.score,
          status: d.status,
          reason: d.reason,
        })),
      }}
      insights={insights.map(ins => ({
        id: ins.id,
        priority: ins.priority,
        category: ins.category,
        title: ins.title,
        message: ins.message,
        actionUrl: ins.actionUrl,
        dataPoint: ins.dataPoint,
      }))}
      payroll={{
        totalPayroll: payroll.totalPayroll,
        paidPayroll: payroll.paidPayroll,
        pendingPayroll: payroll.pendingPayroll,
        employeeCount: payroll.employeeCount,
        leaveUsage: payroll.leaveUsage,
      }}
    />
  );
}
