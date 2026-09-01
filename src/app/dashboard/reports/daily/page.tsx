import { requireActiveBusiness } from '@/lib/auth/guards';
import { getDailyReport } from '@/services/reports';
import { prisma } from '@/lib/db/prisma';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import {
  DailyReportClient,
  type BranchOption,
  type DailySaleRow,
  type DailyTopProduct,
  type GrowthData,
  type HourPoint,
} from './daily-report-client';

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branchId?: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  if (!canAccessDashboardPath(membership.role, '/dashboard/reports/daily')) {
    return <ForbiddenView role={membership.role} />;
  }
  const params = await searchParams;
  const dateInput = params.date;
  const branchId = params.branchId;

  const [report, branches] = await Promise.all([
    getDailyReport(business.id, dateInput, business.timezone, branchId || undefined),
    prisma.branch.findMany({ where: { businessId: business.id }, select: { id: true, name: true } }),
  ]);
  const { summary, growth, hourlyData, topProductsToday, sales, date } = report;

  const hours: HourPoint[] = hourlyData
    .filter((h) => h.hour >= 8 && h.hour <= 22)
    .map((h) => ({ hour: h.hour, revenue: h.revenue, orders: h.orders }));

  const topProducts: DailyTopProduct[] = topProductsToday.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku ?? null,
    unit: item.unit,
    quantity: item.quantity,
    revenue: item.revenue,
    profit: item.profit,
  }));

  const saleRows: DailySaleRow[] = sales.map((s) => ({
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    saleDate: new Date(s.saleDate).toISOString(),
    total: Number(s.total),
    paidAmount: Number(s.paidAmount),
    customerName: s.customer ? s.customer.name : null,
  }));

  const growthData: GrowthData = {
    status: growth.revenueGrowth.status,
    formatted: growth.revenueGrowth.formatted,
  };

  const branchOptions: BranchOption[] = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <DailyReportClient
      date={date}
      branchId={branchId}
      branches={branchOptions}
      summary={{
        grossRevenue: summary.grossRevenue,
        grossProfit: summary.grossProfit,
        expenses: summary.expenses,
        netProfit: summary.netProfit,
        ordersCount: summary.ordersCount,
        creditGiven: summary.creditGiven,
        paymentsReceived: summary.paymentsReceived,
        purchaseSpend: summary.purchaseSpend,
      }}
      growth={growthData}
      hours={hours}
      topProducts={topProducts}
      sales={saleRows}
    />
  );
}
