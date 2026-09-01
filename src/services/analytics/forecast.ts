import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { SaleStatus } from '@/generated/prisma/client';
import { computeForecast, type DailyRevenuePoint } from '@/lib/analytics/forecast-engine';

function buildDailySeries(rows: { saleDate: Date; total: number }[], days: number): DailyRevenuePoint[] {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map.set(d.toISOString().split('T')[0], 0);
  }
  for (const s of rows) {
    const key = s.saleDate.toISOString().split('T')[0];
    if (map.has(key)) {
      map.set(key, map.get(key)! + Number(s.total));
    }
  }
  return Array.from(map.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getSalesForecast(businessId: string, options: {
  days?: number;
  branchId?: string | null;
} = {}): Promise<{
  next7Days: number;
  next30Days: number;
  projectedMonthly: number;
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  message?: string;
  recentAverageDaily: number;
  weekOverWeekGrowthPct: number | null;
}> {
  const lookbackDays = options.days ?? 84;
  const bf = options.branchId && options.branchId.trim().length > 0 ? { branchId: options.branchId } : {};

  const sales = await prisma.sale.findMany({
    where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: new Date(Date.now() - lookbackDays * 86400000) }, ...bf },
    select: { saleDate: true, total: true },
    orderBy: { saleDate: 'asc' },
  });

  const series = buildDailySeries(sales.map((s) => ({ saleDate: s.saleDate, total: Number(s.total) })), lookbackDays);
  const result = computeForecast(series);
  return result;
}

export async function getBusinessGrowthIndicators(businessId: string, options: {
  branchId?: string | null;
  timezone?: string;
} = {}): Promise<{
  revenue: { current: number; previous: number; growth: number | null; direction: 'up' | 'down' | 'flat' };
  profit: { current: number; previous: number; growth: number | null; direction: 'up' | 'down' | 'flat' };
  customers: { current: number; previous: number; growth: number | null; direction: 'up' | 'down' | 'flat' };
  expenses: { current: number; previous: number; growth: number | null; direction: 'up' | 'down' | 'flat' };
  udhaar: { current: number; previous: number; growth: number | null; direction: 'up' | 'down' | 'flat' };
  inventory: { current: number; previous: number; growth: number | null; direction: 'up' | 'down' | 'flat' };
}> {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const bf = options.branchId && options.branchId.trim().length > 0 ? { branchId: options.branchId } : {};

  const [cSales, pSales, cItems, pItems, cExp, pExp, cCust, pCust, cInv, pInv, custAgg, prevCustAgg] = await Promise.all([
    prisma.sale.aggregate({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: currentStart }, ...bf }, _sum: { total: true } }),
    prisma.sale.aggregate({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: prevStart, lte: prevEnd }, ...bf }, _sum: { total: true } }),
    prisma.saleItem.aggregate({ where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: currentStart }, ...bf } }, _sum: { lineProfit: true } }),
    prisma.saleItem.aggregate({ where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: prevStart, lte: prevEnd }, ...bf } }, _sum: { lineProfit: true } }),
    prisma.expense.aggregate({ where: { businessId, cancelledAt: null, date: { gte: currentStart }, ...bf }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { businessId, cancelledAt: null, date: { gte: prevStart, lte: prevEnd }, ...bf }, _sum: { amount: true } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: currentStart } } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: prevStart, lte: prevEnd } } }),
    prisma.product.count({ where: { businessId, isActive: true } }),
    prisma.product.count({ where: { businessId, isActive: true, createdAt: { lte: prevEnd } } }),
    prisma.customer.aggregate({ where: { businessId, isActive: true }, _sum: { outstanding: true } }),
    prisma.customer.aggregate({ where: { businessId, isActive: true, createdAt: { lte: prevEnd } }, _sum: { outstanding: true } }),
  ]);

  const dir = (cur: number, prev: number) => {
    if (prev === 0 && cur === 0) return 'flat';
    if (prev === 0) return 'up';
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    if (pct > 2) return 'up';
    if (pct < -2) return 'down';
    return 'flat';
  };

  const growth = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10);

  const curRev = Number(cSales._sum.total || 0);
  const prevRev = Number(pSales._sum.total || 0);
  const curProf = Number(cItems._sum.lineProfit || 0);
  const prevProf = Number(pItems._sum.lineProfit || 0);
  const curExp = Number(cExp._sum.amount || 0);
  const prevExp = Number(pExp._sum.amount || 0);
  const curUdhaar = Number(custAgg._sum.outstanding || 0);
  const prevUdhaar = Number(prevCustAgg._sum.outstanding || 0);

  return {
    revenue: { current: curRev, previous: prevRev, growth: growth(curRev, prevRev), direction: dir(curRev, prevRev) },
    profit: { current: curProf, previous: prevProf, growth: growth(curProf, prevProf), direction: dir(curProf, prevProf) },
    customers: { current: cCust, previous: pCust, growth: growth(cCust, pCust), direction: dir(cCust, pCust) },
    expenses: { current: curExp, previous: prevExp, growth: growth(curExp, prevExp), direction: dir(curExp, prevExp) },
    udhaar: { current: curUdhaar, previous: prevUdhaar, growth: growth(curUdhaar, prevUdhaar), direction: dir(curUdhaar, prevUdhaar) },
    inventory: { current: cInv, previous: pInv, growth: growth(cInv, pInv), direction: dir(cInv, pInv) },
  };
}
