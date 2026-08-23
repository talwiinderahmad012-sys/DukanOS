import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { SaleStatus } from '@/generated/prisma/client';
import { buildCohortSummary, summarizeCohorts, type CohortRow } from '@/lib/analytics/cohort-engine';

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getCustomerCohortAnalytics(businessId: string, options: {
  monthsBack?: number;
  branchId?: string | null;
  maxOffsets?: number;
} = {}): Promise<{
  rows: CohortRow[];
  overallRepeatPurchaseRate: number;
  averageCustomerLifetimeValue: number;
  totalCustomers: number;
}> {
  const monthsBack = options.monthsBack ?? 12;
  const maxOffsets = options.maxOffsets ?? 6;
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

  const bf = options.branchId && options.branchId.trim().length > 0 ? { branchId: options.branchId } : {};

  const sales = await prisma.sale.findMany({
    where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: from }, customerId: { not: null }, ...bf },
    select: { customerId: true, saleDate: true, total: true },
    orderBy: { saleDate: 'asc' },
  });

  if (!sales.length) {
    return { rows: [], overallRepeatPurchaseRate: 0, averageCustomerLifetimeValue: 0, totalCustomers: 0 };
  }

  const firstPurchaseByCustomer = new Map<string, { month: string; total: number; orders: number }>();
  for (const s of sales) {
    const existing = firstPurchaseByCustomer.get(s.customerId!);
    const mk = monthKey(s.saleDate);
    if (!existing) {
      firstPurchaseByCustomer.set(s.customerId!, { month: mk, total: Number(s.total), orders: 1 });
    } else {
      existing.total += Number(s.total);
      existing.orders += 1;
      if (mk < existing.month) existing.month = mk;
    }
  }

  const cohortCustomers = new Map<string, Set<string>>();
  for (const [customerId, data] of firstPurchaseByCustomer.entries()) {
    const set = cohortCustomers.get(data.month) || new Set<string>();
    set.add(customerId);
    cohortCustomers.set(data.month, set);
  }

  type CohortEntry = {
    size: number;
    totalRevenue: number;
    repeaters: number;
    offsets: { offset: number; activeCustomers: number; revenue: number }[];
  };

  const cohortMap = new Map<string, CohortEntry>();
  for (const [cohortKey, custSet] of cohortCustomers.entries()) {
    cohortMap.set(cohortKey, {
      size: custSet.size,
      totalRevenue: 0,
      repeaters: 0,
      offsets: Array.from({ length: maxOffsets + 1 }, (_, i) => ({ offset: i, activeCustomers: 0, revenue: 0 })),
    });
    for (const cid of custSet) {
      const d = firstPurchaseByCustomer.get(cid)!;
      cohortMap.get(cohortKey)!.totalRevenue += d.total;
      if (d.orders >= 2) cohortMap.get(cohortKey)!.repeaters += 1;
    }
  }

  for (const sale of sales) {
    const cohortData = firstPurchaseByCustomer.get(sale.customerId!);
    if (!cohortData) continue;
    const cohortKey = cohortData.month;
    const entry = cohortMap.get(cohortKey);
    if (!entry) continue;

    const cohortParts = cohortKey.split('-').map(Number);
    const saleMonth = monthKey(sale.saleDate);
    const saleParts = saleMonth.split('-').map(Number);
    const cohortDate = new Date(cohortParts[0] || 2024, (cohortParts[1] || 1) - 1, 1);
    const saleDate = new Date(saleParts[0] || 2024, (saleParts[1] || 1) - 1, 1);
    const offset = (saleDate.getFullYear() - cohortDate.getFullYear()) * 12 + (saleDate.getMonth() - cohortDate.getMonth());
    if (offset < 0 || offset > maxOffsets) continue;

    entry.offsets[offset].activeCustomers += 1;
    entry.offsets[offset].revenue += Number(sale.total);
  }

  const sortedCohorts = Array.from(cohortCustomers.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const rows = sortedCohorts.map(([cohortKey, custSet]) => {
    const entry = cohortMap.get(cohortKey)!;
    return buildCohortSummary({
      cohortKey,
      size: custSet.size,
      totalRevenue: entry.totalRevenue,
      repeaters: entry.repeaters,
      offsets: entry.offsets,
    });
  });

  const summary = summarizeCohorts(rows);
  return { rows, ...summary };
}
