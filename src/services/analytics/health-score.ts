import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { calculateGrowth, getMonthlyRange } from '@/lib/utils/date-utils';
import { SaleStatus } from '@/generated/prisma/client';

export type HealthDimension = {
  name: string;
  score: number;
  weight: number;
  status: 'excellent' | 'healthy' | 'needs_attention' | 'critical';
  reason: string;
};

export type BusinessHealthResult = {
  overallScore: number;
  status: 'Excellent' | 'Healthy' | 'Needs Attention' | 'Critical';
  dimensions: HealthDimension[];
  calculatedAt: Date;
};

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

function dimStatus(score: number): 'excellent' | 'healthy' | 'needs_attention' | 'critical' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'healthy';
  if (score >= 35) return 'needs_attention';
  return 'critical';
}

export async function calculateBusinessHealth(
  businessId: string,
  timezone: string
): Promise<BusinessHealthResult> {
  const now   = new Date();
  const thisM = getMonthlyRange(now.getFullYear(), now.getMonth() + 1);
  const pmNum = now.getMonth() === 0 ? 12 : now.getMonth();
  const pmYear= now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevM = getMonthlyRange(pmYear, pmNum);

  // Fetch all required data in parallel
  const [
    curSales, prevSales,
    curItems, prevItems,
    curExp,
    customers,
    newCust, prevNewCust,
    products,
    settings,
  ] = await Promise.all([
    prisma.sale.aggregate({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } }, _sum: { total: true }, _count: { id: true } }),
    prisma.sale.aggregate({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: prevM.start, lte: prevM.end } }, _sum: { total: true }, _count: { id: true } }),
    prisma.saleItem.aggregate({ where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } } }, _sum: { lineProfit: true } }),
    prisma.saleItem.aggregate({ where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: prevM.start, lte: prevM.end } } }, _sum: { lineProfit: true } }),
    prisma.expense.aggregate({ where: { businessId, cancelledAt: null, date: { gte: thisM.start, lte: thisM.end } }, _sum: { amount: true } }),
    prisma.customer.aggregate({ where: { businessId, isActive: true }, _sum: { outstanding: true } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: thisM.start, lte: thisM.end } } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: prevM.start, lte: prevM.end } } }),
    prisma.product.findMany({ where: { businessId, isActive: true }, select: { currentStock: true, minStockThreshold: true } }),
    prisma.businessSetting.findUnique({ where: { businessId }, select: { lowStockThresholdDefault: true, criticalStockThreshold: true } }),
  ]);

  const curRevenue  = Number(curSales._sum.total   || 0);
  const prevRevenue = Number(prevSales._sum.total  || 0);
  const curProfit   = Number(curItems._sum.lineProfit  || 0);
  const prevProfit  = Number(prevItems._sum.lineProfit || 0);
  const curExpenses = Number(curExp._sum.amount    || 0);
  const totalOutstanding = Number(customers._sum.outstanding || 0);
  const lowT  = settings?.lowStockThresholdDefault ?? 5;
  const critT = settings?.criticalStockThreshold   ?? 2;

  // ── Dimension 1: Sales Growth (weight 0.25) ────────────────────────────────
  let salesScore = 75; // default for new businesses
  let salesReason = 'Insufficient comparison data (new business or first month)';
  if (prevRevenue > 0) {
    const g = calculateGrowth(curRevenue, prevRevenue);
    const pct = g.percentage ?? 0;
    if (pct >= 10)       { salesScore = 100; salesReason = `Sales grew ${pct.toFixed(1)}% vs last month`; }
    else if (pct >= 0)   { salesScore = clamp(60 + pct * 4); salesReason = `Sales grew ${pct.toFixed(1)}% vs last month`; }
    else if (pct >= -10) { salesScore = clamp(30 + (pct + 10) * 3); salesReason = `Sales declined ${Math.abs(pct).toFixed(1)}% vs last month`; }
    else                 { salesScore = clamp(30 + pct * 1.5); salesReason = `Sales declined ${Math.abs(pct).toFixed(1)}% vs last month (significant)`; }
  } else if (curRevenue > 0) {
    salesScore = 75; salesReason = 'First sales recorded — no comparison data yet';
  }

  // ── Dimension 2: Profitability (weight 0.25) ──────────────────────────────
  let profitScore = 50;
  let profitReason = 'No sales data for this month';
  if (curRevenue > 0) {
    const margin = (curProfit / curRevenue) * 100;
    if (margin >= 30)      { profitScore = 100; profitReason = `Gross margin ${margin.toFixed(1)}% — excellent`; }
    else if (margin >= 20) { profitScore = 80;  profitReason = `Gross margin ${margin.toFixed(1)}%`; }
    else if (margin >= 10) { profitScore = 60;  profitReason = `Gross margin ${margin.toFixed(1)}% — moderate`; }
    else if (margin >= 5)  { profitScore = 40;  profitReason = `Gross margin ${margin.toFixed(1)}% — thin`; }
    else if (margin >= 0)  { profitScore = 20;  profitReason = `Gross margin ${margin.toFixed(1)}% — very thin`; }
    else                   { profitScore = 0;   profitReason = `Negative gross margin — selling below cost`; }
  }

  // ── Dimension 3: Inventory Health (weight 0.20) ───────────────────────────
  const total = products.length;
  let outOfStock = 0, criticalStock = 0;
  for (const p of products) {
    if (p.currentStock <= 0) outOfStock++;
    else if (p.currentStock <= critT) criticalStock++;
  }
  let inventoryScore = 100;
  let inventoryReason = 'All products are adequately stocked';
  if (total > 0) {
    const oos = outOfStock / total;
    const crit = criticalStock / total;
    inventoryScore = clamp(100 - oos * 200 - crit * 100);
    if (outOfStock > 0) inventoryReason = `${outOfStock} product(s) out of stock, ${criticalStock} critical`;
    else if (criticalStock > 0) inventoryReason = `${criticalStock} product(s) at critical stock level`;
    else inventoryReason = 'All products are adequately stocked';
  }

  // ── Dimension 4: Udhaar Health (weight 0.15) ──────────────────────────────
  let udhaarScore = 100;
  let udhaarReason = 'No outstanding Udhaar — healthy';
  if (curRevenue > 0 && totalOutstanding > 0) {
    const ratio = totalOutstanding / curRevenue;
    if (ratio < 0.1)       { udhaarScore = 100; udhaarReason = `Outstanding Udhaar is ${(ratio * 100).toFixed(0)}% of monthly revenue — low risk`; }
    else if (ratio < 0.3)  { udhaarScore = 75;  udhaarReason = `Outstanding Udhaar is ${(ratio * 100).toFixed(0)}% of monthly revenue`; }
    else if (ratio < 0.5)  { udhaarScore = 50;  udhaarReason = `Outstanding Udhaar is ${(ratio * 100).toFixed(0)}% of monthly revenue — moderate risk`; }
    else if (ratio < 1.0)  { udhaarScore = 25;  udhaarReason = `Outstanding Udhaar exceeds ${(ratio * 100).toFixed(0)}% of monthly revenue — high risk`; }
    else                   { udhaarScore = 0;   udhaarReason = `Outstanding Udhaar exceeds monthly revenue — critical`; }
  } else if (totalOutstanding > 0) {
    udhaarScore = 40; udhaarReason = `Rs. ${totalOutstanding.toLocaleString()} outstanding (no current revenue to compare)`;
  }

  // ── Dimension 5: Expense Control (weight 0.10) ────────────────────────────
  let expenseScore = 100;
  let expenseReason = 'No expenses recorded';
  if (curRevenue > 0 && curExpenses > 0) {
    const er = curExpenses / curRevenue;
    if (er < 0.3)      { expenseScore = 100; expenseReason = `Expenses are ${(er * 100).toFixed(0)}% of revenue — well controlled`; }
    else if (er < 0.5) { expenseScore = 75;  expenseReason = `Expenses are ${(er * 100).toFixed(0)}% of revenue`; }
    else if (er < 0.7) { expenseScore = 50;  expenseReason = `Expenses are ${(er * 100).toFixed(0)}% of revenue — high`; }
    else               { expenseScore = 25;  expenseReason = `Expenses exceed ${(er * 100).toFixed(0)}% of revenue — critical`; }
  }

  // ── Dimension 6: Customer Growth (weight 0.05) ────────────────────────────
  let custScore = 50;
  let custReason = 'No new customers this month';
  if (newCust > 0) {
    const g = calculateGrowth(newCust, prevNewCust);
    if (newCust >= 5 && (g.status === 'UP' || g.status === 'NO_BASELINE')) {
      custScore = 100; custReason = `${newCust} new customer(s) this month — growing`;
    } else if (newCust > 0) {
      custScore = 75; custReason = `${newCust} new customer(s) this month`;
    }
  } else if (prevNewCust > 0) {
    custScore = 25; custReason = 'No new customers this month (had some last month)';
  }

  // ── Overall Score ──────────────────────────────────────────────────────────
  const dimensions: HealthDimension[] = [
    { name: 'Sales Growth',    score: Math.round(salesScore),    weight: 0.25, status: dimStatus(salesScore),    reason: salesReason },
    { name: 'Profitability',   score: Math.round(profitScore),   weight: 0.25, status: dimStatus(profitScore),   reason: profitReason },
    { name: 'Inventory Health',score: Math.round(inventoryScore),weight: 0.20, status: dimStatus(inventoryScore),reason: inventoryReason },
    { name: 'Udhaar Health',   score: Math.round(udhaarScore),   weight: 0.15, status: dimStatus(udhaarScore),   reason: udhaarReason },
    { name: 'Expense Control', score: Math.round(expenseScore),  weight: 0.10, status: dimStatus(expenseScore),  reason: expenseReason },
    { name: 'Customer Growth', score: Math.round(custScore),     weight: 0.05, status: dimStatus(custScore),     reason: custReason },
  ];

  const overallScore = Math.round(
    dimensions.reduce((s, d) => s + d.score * d.weight, 0)
  );

  let status: BusinessHealthResult['status'];
  if (overallScore >= 80)      status = 'Excellent';
  else if (overallScore >= 60) status = 'Healthy';
  else if (overallScore >= 40) status = 'Needs Attention';
  else                         status = 'Critical';

  return { overallScore, status, dimensions, calculatedAt: new Date() };
}
