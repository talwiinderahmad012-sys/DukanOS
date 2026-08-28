import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import {
  getMonthlyReport,
  getTopSellingProducts,
  getSlowMovingProducts,
} from '@/services/reports';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import {
  ReportsPageClient,
  type BranchOption,
  type DailyTrendPoint,
  type SlowProductData,
  type TopProductData,
} from './reports-page-client';

export default async function ReportsHubPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const [monthlyData, topProducts, slowProducts, branches] = await Promise.all([
    getMonthlyReport(business.id, undefined, undefined, business.timezone),
    getTopSellingProducts(business.id, { limit: 5 }),
    getSlowMovingProducts(business.id, { daysThreshold: 30, limit: 5 }),
    prisma.branch.findMany({ where: { businessId: business.id }, select: { id: true, name: true } }),
  ]);

  const dailyTrend: DailyTrendPoint[] = monthlyData.dailyData.slice(0, 15).map((d) => ({
    day: d.day,
    revenue: d.revenue,
    profit: d.profit,
    expenses: d.expenses,
  }));

  const topProductRows: TopProductData[] = topProducts.map((p) => ({
    productId: p.productId,
    name: p.name,
    unit: p.unit,
    currentStock: p.currentStock,
    quantitySold: p.quantitySold,
    revenue: p.revenue,
  }));

  const slowProductRows: SlowProductData[] = slowProducts.map((p) => ({
    productId: p.productId,
    name: p.name,
    unit: p.unit,
    currentStock: p.currentStock,
    stockValue: p.stockValue,
  }));

  const branchOptions: BranchOption[] = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <ReportsPageClient
      businessId={business.id}
      snapshot={{
        year: monthlyData.year,
        month: monthlyData.month,
        grossRevenue: monthlyData.summary.grossRevenue,
        grossProfit: monthlyData.summary.grossProfit,
        expenses: monthlyData.summary.expenses,
        netProfit: monthlyData.summary.netProfit,
        ordersCount: monthlyData.summary.ordersCount,
      }}
      dailyTrend={dailyTrend}
      topProducts={topProductRows}
      slowProducts={slowProductRows}
      branches={branchOptions}
    />
  );
}
