import { requireActiveBusiness } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { generateAdvisorFindings } from '@/services/advisor';
import { getSalesTrend, getUdhaarAnalytics, getCurrentMonthPeriods } from '@/services/analytics';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { DashboardPageClient } from './dashboard-page-client';

export default async function DashboardPage() {
  const { user, membership, business } = await requireActiveBusiness();

  // The overview renders financial KPI cards (revenue, profit, udhaar).
  // Roles without VIEW_FINANCIAL_REPORTS get the accessible forbidden state.
  if (!canAccessDashboardPath(membership.role, '/dashboard')) {
    return <ForbiddenView role={membership.role} />;
  }

  const tz = business.timezone || 'Asia/Karachi';
  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { period } = getCurrentMonthPeriods();

  const [
    products,
    todaySalesAggregate,
    todayProfitAggregate,
    customerAggregate,
    recentSales,
    advisorData,
    salesTrend,
    udhaar,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true, sku: true, unit: true, currentStock: true, minStockThreshold: true },
    }),
    prisma.sale.aggregate({
      where: {
        businessId: business.id,
        status: 'COMPLETED',
        saleDate: { gte: todayStart },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId: business.id,
          status: 'COMPLETED',
          saleDate: { gte: todayStart },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.customer.aggregate({
      where: { businessId: business.id, isActive: true },
      _sum: { outstanding: true },
      _count: { id: true },
    }),
    prisma.sale.findMany({
      where: { businessId: business.id },
      include: {
        customer: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    generateAdvisorFindings(business.id, tz),
    getSalesTrend(business.id, 7, tz),
    getUdhaarAnalytics(business.id, period, tz),
  ]);

  const outOfStockProducts = products.filter((p) => p.currentStock <= 0);
  const lowStockProducts = products.filter(
    (p) => p.currentStock > 0 && p.minStockThreshold !== null && p.currentStock <= p.minStockThreshold,
  );
  const attentionProducts = [...outOfStockProducts, ...lowStockProducts]
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, 6);

  const todaySalesTotal = Number(todaySalesAggregate._sum.total || 0);
  const todaySalesCount = todaySalesAggregate._count.id;
  const todayProfitTotal = Number(todayProfitAggregate._sum.lineProfit || 0);
  const totalUdhaar = Number(customerAggregate._sum.outstanding || 0);
  const activeCustomerCount = customerAggregate._count.id;

  const { healthScore, findings, summaryText } = advisorData;

  return (
    <DashboardPageClient
      businessName={business.name}
      userName={user.name ?? null}
      role={membership.role}
      isOwnerOrManager={isOwnerOrManager}
      todaySalesTotal={todaySalesTotal}
      todaySalesCount={todaySalesCount}
      todayProfitTotal={todayProfitTotal}
      totalUdhaar={totalUdhaar}
      activeCustomerCount={activeCustomerCount}
      attentionCount={outOfStockProducts.length + lowStockProducts.length}
      outOfStockCount={outOfStockProducts.length}
      lowStockCount={lowStockProducts.length}
      attentionProducts={attentionProducts.map((p) => ({
        id: p.id,
        name: p.name,
        currentStock: p.currentStock,
        minStockThreshold: p.minStockThreshold,
        unit: p.unit,
      }))}
      healthScore={healthScore.score}
      healthGrade={healthScore.grade}
      summaryText={summaryText}
      topFindings={findings.slice(0, 2).map((f) => ({
        id: f.id,
        severity: f.severity,
        title: f.title,
        message: f.message,
        metric: f.metric ?? null,
      }))}
      trendData={salesTrend.map((d) => ({ date: d.date, revenue: d.revenue, profit: d.profit }))}
      trendRevenueTotal={salesTrend.reduce((sum, d) => sum + d.revenue, 0)}
      recentSales={recentSales.map((sale) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customer?.name ?? null,
        itemsCount: sale.items.length,
        saleDate: sale.saleDate.toISOString(),
        total: Number(sale.total),
        paidAmount: Number(sale.paidAmount),
        status: sale.status,
      }))}
      udhaarCollectedThisPeriod={udhaar.paymentsReceivedThisPeriod}
      udhaarNewCreditThisPeriod={udhaar.newCreditThisPeriod}
      udhaarTotalOutstanding={udhaar.totalOutstanding}
      topDebtors={udhaar.topDebtors.map((d) => ({
        customerId: d.customerId,
        name: d.name,
        outstanding: d.outstanding,
      }))}
    />
  );
}
