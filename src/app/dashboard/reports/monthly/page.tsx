import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getMonthlyReport, getTopSellingProducts } from '@/services/reports';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import {
  MonthlyReportClient,
  type BranchOption,
  type ExpenseCategoryData,
  type GrowthData,
  type TopProductData,
} from './monthly-report-client';

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; branchId?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (!canAccessDashboardPath(membership.role, '/dashboard/reports/monthly')) {
    return <ForbiddenView role={membership.role} />;
  }
  const params = await searchParams;

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const branchId = params.branchId;

  const [monthlyData, topProducts, branches] = await Promise.all([
    getMonthlyReport(business.id, year, month, business.timezone, branchId || undefined),
    getTopSellingProducts(business.id, { limit: 5 }),
    prisma.branch.findMany({ where: { businessId: business.id }, select: { id: true, name: true } }),
  ]);

  const { summary, growth, dailyData, expenseCategories } = monthlyData;

  const expenseRows: ExpenseCategoryData[] = expenseCategories.map((item) => ({
    category: item.category,
    amount: item.amount,
    percentage: item.percentage,
  }));

  const topProductRows: TopProductData[] = topProducts.map((p) => ({
    productId: p.productId,
    name: p.name,
    unit: p.unit,
    currentStock: p.currentStock,
    quantitySold: p.quantitySold,
    revenue: p.revenue,
  }));

  const growthData: GrowthData = {
    status: growth.revenueGrowth.status,
    formatted: growth.revenueGrowth.formatted,
  };

  const branchOptions: BranchOption[] = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <MonthlyReportClient
      year={monthlyData.year}
      month={monthlyData.month}
      branchId={branchId}
      branches={branchOptions}
      summary={{
        grossRevenue: summary.grossRevenue,
        grossProfit: summary.grossProfit,
        expenses: summary.expenses,
        netProfit: summary.netProfit,
        ordersCount: summary.ordersCount,
      }}
      growth={growthData}
      daily={dailyData.map((d) => ({ day: d.day, revenue: d.revenue, profit: d.profit, expenses: d.expenses }))}
      expenseCategories={expenseRows}
      topProducts={topProductRows}
    />
  );
}
