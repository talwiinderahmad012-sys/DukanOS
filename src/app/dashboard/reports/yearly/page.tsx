import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getYearlyReport } from '@/services/reports';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import {
  YearlyReportClient,
  type BranchOption,
  type GrowthData,
  type YearlyMonthRow,
} from './yearly-report-client';

export default async function YearlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; branchId?: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const branchId = params.branchId;

  const [report, branches] = await Promise.all([
    getYearlyReport(business.id, year, business.timezone, branchId || undefined),
    prisma.branch.findMany({ where: { businessId: business.id }, select: { id: true, name: true } }),
  ]);
  const { summary, growth, monthlyData } = report;

  const monthRows: YearlyMonthRow[] = monthlyData.map((m) => ({
    month: m.month,
    revenue: m.revenue,
    grossProfit: m.grossProfit,
    expenses: m.expenses,
    netProfit: m.netProfit,
    orders: m.orders,
  }));

  const growthData: GrowthData = {
    status: growth.revenueGrowth.status,
    formatted: growth.revenueGrowth.formatted,
  };

  const branchOptions: BranchOption[] = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <YearlyReportClient
      year={report.year}
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
      months={monthRows}
    />
  );
}
