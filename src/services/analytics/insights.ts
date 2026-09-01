import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { calculateGrowth, getMonthlyRange } from '@/lib/utils/date-utils';
import { SaleStatus } from '@/generated/prisma/client';

export type BusinessInsight = {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'SALES' | 'INVENTORY' | 'UDHAAR' | 'EXPENSES' | 'CUSTOMERS' | 'GROWTH';
  title: string;
  message: string;
  actionUrl?: string;
  dataPoint?: string;
};

export async function generateBusinessInsights(
  businessId: string,
  timezone: string
): Promise<BusinessInsight[]> {
  const now   = new Date();
  const thisM = getMonthlyRange(now.getFullYear(), now.getMonth() + 1);
  const pmNum = now.getMonth() === 0 ? 12 : now.getMonth();
  const pmYear= now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevM = getMonthlyRange(pmYear, pmNum);

  // Fetch all data in parallel
  const [
    curSalesAgg, prevSalesAgg,
    curItemsAgg, prevItemsAgg,
    curExpAgg,   prevExpAgg,
    custAgg,
    newCust,     prevNewCust,
    products,
    settings,
    topProduct,
    periodPayments,
    periodSales,
    businessAge,
  ] = await Promise.all([
    prisma.sale.aggregate({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } }, _sum: { total: true }, _count: { id: true } }),
    prisma.sale.aggregate({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: prevM.start, lte: prevM.end } }, _sum: { total: true }, _count: { id: true } }),
    prisma.saleItem.aggregate({ where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } } }, _sum: { lineProfit: true } }),
    prisma.saleItem.aggregate({ where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: prevM.start, lte: prevM.end } } }, _sum: { lineProfit: true } }),
    prisma.expense.aggregate({ where: { businessId, cancelledAt: null, date: { gte: thisM.start, lte: thisM.end } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { businessId, cancelledAt: null, date: { gte: prevM.start, lte: prevM.end } }, _sum: { amount: true } }),
    prisma.customer.aggregate({ where: { businessId, isActive: true }, _sum: { outstanding: true } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: thisM.start, lte: thisM.end } } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: prevM.start, lte: prevM.end } } }),
    prisma.product.findMany({ where: { businessId, isActive: true }, select: { id: true, name: true, currentStock: true, minStockThreshold: true, purchasePrice: true, createdAt: true } }),
    prisma.businessSetting.findUnique({ where: { businessId }, select: { lowStockThresholdDefault: true, criticalStockThreshold: true, slowMovingDays: true } }),
    // Top product this month
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1,
    }),
    prisma.customerPayment.aggregate({ where: { businessId, date: { gte: thisM.start, lte: thisM.end } }, _sum: { amount: true } }),
    prisma.sale.findMany({ where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: thisM.start, lte: thisM.end } }, select: { total: true, paidAmount: true } }),
    prisma.business.findUnique({ where: { id: businessId }, select: { createdAt: true } }),
  ]);

  const curRevenue  = Number(curSalesAgg._sum.total   || 0);
  const prevRevenue = Number(prevSalesAgg._sum.total  || 0);
  const curOrders   = curSalesAgg._count.id;
  const curProfit   = Number(curItemsAgg._sum.lineProfit  || 0);
  const prevProfit  = Number(prevItemsAgg._sum.lineProfit || 0);
  const curExpenses = Number(curExpAgg._sum.amount    || 0);
  const prevExpenses= Number(prevExpAgg._sum.amount   || 0);
  const totalOutstanding = Number(custAgg._sum.outstanding || 0);
  const newCreditThisMonth = periodSales.reduce((s, sl) => s + Math.max(0, Number(sl.total) - Number(sl.paidAmount)), 0);
  const paymentsThisMonth  = Number(periodPayments._sum.amount || 0);

  const lowT  = settings?.lowStockThresholdDefault ?? 5;
  const critT = settings?.criticalStockThreshold   ?? 2;
  const slowDays = settings?.slowMovingDays ?? 30;

  const businessDays = businessAge ? Math.floor((now.getTime() - businessAge.createdAt.getTime()) / 86400000) : 999;

  const insights: BusinessInsight[] = [];
  let nextId = 1;
  const id = () => String(nextId++);

  // ─── SALES insights ─────────────────────────────────────────────────────────
  if (prevRevenue > 0) {
    const g = calculateGrowth(curRevenue, prevRevenue);
    const pct = g.percentage ?? 0;
    if (pct >= 10) {
      insights.push({ id: id(), priority: 'LOW', category: 'SALES', title: 'Strong Sales Growth', message: `Sales increased ${pct.toFixed(1)}% compared to last month (Rs. ${Math.round(curRevenue).toLocaleString()} vs Rs. ${Math.round(prevRevenue).toLocaleString()}).`, dataPoint: g.formatted });
    } else if (pct <= -15) {
      insights.push({ id: id(), priority: 'HIGH', category: 'SALES', title: 'Sales Dropped Significantly', message: `Sales declined ${Math.abs(pct).toFixed(1)}% compared to last month. Investigate root cause — reduced footfall, stock-outs, or seasonal factors.`, actionUrl: '/dashboard/reports/monthly', dataPoint: g.formatted });
    } else if (pct <= -5) {
      insights.push({ id: id(), priority: 'MEDIUM', category: 'SALES', title: 'Sales Slightly Lower', message: `Sales are ${Math.abs(pct).toFixed(1)}% below last month. Monitor closely.`, dataPoint: g.formatted });
    }
  }

  // Profit margin shrinking
  if (prevRevenue > 0 && prevProfit > 0 && curRevenue > 0) {
    const curMargin  = curRevenue  > 0 ? curProfit  / curRevenue  : 0;
    const prevMargin = prevRevenue > 0 ? prevProfit / prevRevenue : 0;
    if (curMargin < prevMargin - 0.05) {
      insights.push({ id: id(), priority: 'MEDIUM', category: 'GROWTH', title: 'Profit Margin Declining', message: `Gross margin fell from ${(prevMargin * 100).toFixed(1)}% to ${(curMargin * 100).toFixed(1)}% this month. Check for increased costs or higher discounts.`, actionUrl: '/dashboard/reports/monthly' });
    }
  }

  // Expenses growing faster than sales
  if (prevExpenses > 0 && prevRevenue > 0 && curRevenue > 0) {
    const expG = calculateGrowth(curExpenses, prevExpenses);
    const revG = calculateGrowth(curRevenue, prevRevenue);
    const ep   = expG.percentage ?? 0;
    const rp   = revG.percentage ?? 0;
    if (ep > rp + 10) {
      insights.push({ id: id(), priority: 'MEDIUM', category: 'EXPENSES', title: 'Expenses Growing Faster Than Sales', message: `Expenses grew ${ep.toFixed(1)}% while sales grew ${rp.toFixed(1)}%. Review expense categories for unnecessary costs.`, actionUrl: '/dashboard/reports/monthly', dataPoint: expG.formatted });
    }
  }

  // Top product insight
  if (topProduct.length > 0 && curOrders > 0) {
    const tp = topProduct[0];
    const units = Number(tp._sum.quantity || 0);
    if (units > 0) {
      const prod = await prisma.product.findUnique({ where: { id: tp.productId }, select: { name: true, currentStock: true } });
      if (prod) {
        const shareMsg = `"${prod.name}" sold ${units} units this month`;
        if (prod.currentStock <= critT) {
          insights.push({ id: id(), priority: 'HIGH', category: 'INVENTORY', title: `Top Seller Running Low: ${prod.name}`, message: `${shareMsg} but only ${prod.currentStock} units remain in stock. Restock immediately to avoid lost sales.`, actionUrl: '/dashboard/inventory', dataPoint: `${prod.currentStock} units left` });
        } else {
          insights.push({ id: id(), priority: 'LOW', category: 'SALES', title: `Top Selling Product: ${prod.name}`, message: `${shareMsg} — your best performer this month.`, actionUrl: '/dashboard/inventory' });
        }
      }
    }
  }

  // ─── INVENTORY insights ──────────────────────────────────────────────────────
  let outOfStock = 0, criticalCount = 0;
  const slowMoving: string[] = [];
  const minAge = new Date(now); minAge.setDate(minAge.getDate() - 14);

  for (const p of products) {
    if (p.currentStock <= 0)   { outOfStock++; }
    else if (p.currentStock <= critT) { criticalCount++; }
  }

  // Slow-moving products count
  if (businessDays >= 14) {
    const threshold = new Date(now); threshold.setDate(threshold.getDate() - slowDays);
    const sold = await prisma.saleItem.findMany({
      where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: threshold } } },
      select: { productId: true }, distinct: ['productId'],
    });
    const soldIds = new Set(sold.map(s => s.productId));
    const slowProds = products.filter(p => p.currentStock > 0 && !soldIds.has(p.id) && p.createdAt <= minAge);
    if (slowProds.length > 0) {
      insights.push({ id: id(), priority: 'MEDIUM', category: 'INVENTORY', title: 'Slow-Moving Stock Detected', message: `${slowProds.length} product(s) have had no sales in the last ${slowDays} days but still hold stock. Consider promotions or markdowns.`, actionUrl: '/dashboard/inventory', dataPoint: `${slowProds.length} products` });
    }
  }

  if (outOfStock > 0) {
    insights.push({ id: id(), priority: 'HIGH', category: 'INVENTORY', title: `${outOfStock} Product(s) Out of Stock`, message: `${outOfStock} active product(s) are completely out of stock. Sales are being lost right now.`, actionUrl: '/dashboard/inventory', dataPoint: `${outOfStock} out of stock` });
  }
  if (criticalCount > 0) {
    insights.push({ id: id(), priority: 'HIGH', category: 'INVENTORY', title: `${criticalCount} Product(s) at Critical Stock`, message: `${criticalCount} product(s) are at or below the critical stock threshold. Restock soon to avoid stockouts.`, actionUrl: '/dashboard/inventory', dataPoint: `${criticalCount} critical` });
  }

  // ─── UDHAAR insights ─────────────────────────────────────────────────────────
  if (totalOutstanding > 0) {
    const netChange = newCreditThisMonth - paymentsThisMonth;
    if (netChange > 0 && curRevenue > 0) {
      const ratio = totalOutstanding / curRevenue;
      if (ratio > 0.5) {
        insights.push({ id: id(), priority: 'HIGH', category: 'UDHAAR', title: 'High Udhaar Outstanding', message: `Outstanding Udhaar (Rs. ${Math.round(totalOutstanding).toLocaleString()}) exceeds 50% of this month's sales. Follow up with customers to recover credit.`, actionUrl: '/dashboard/customers', dataPoint: `Rs. ${Math.round(totalOutstanding).toLocaleString()}` });
      } else if (netChange > 0) {
        insights.push({ id: id(), priority: 'MEDIUM', category: 'UDHAAR', title: 'Udhaar Increased This Month', message: `Outstanding credit grew by Rs. ${Math.round(netChange).toLocaleString()} this month (new credit Rs. ${Math.round(newCreditThisMonth).toLocaleString()}, payments Rs. ${Math.round(paymentsThisMonth).toLocaleString()}).`, actionUrl: '/dashboard/customers' });
      }
    }
  }

  // ─── CUSTOMER insights ───────────────────────────────────────────────────────
  if (newCust > 0) {
    const g = calculateGrowth(newCust, prevNewCust);
    if (g.status === 'UP' || g.status === 'NO_BASELINE') {
      insights.push({ id: id(), priority: 'LOW', category: 'CUSTOMERS', title: 'New Customers Acquired', message: `${newCust} new customer(s) joined this month${prevNewCust > 0 ? ` (${g.formatted} vs last month)` : ''}.`, dataPoint: `+${newCust} customers` });
    }
  } else if (businessDays >= 30 && prevNewCust > 0) {
    insights.push({ id: id(), priority: 'MEDIUM', category: 'CUSTOMERS', title: 'No New Customers This Month', message: `No new customers recorded this month, compared to ${prevNewCust} last month. Consider promotions or referrals.`, actionUrl: '/dashboard/customers' });
  }

  // Sort: HIGH first, then MEDIUM, then LOW — then cap at 8
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  insights.sort((a, b) => order[a.priority] - order[b.priority]);
  return insights.slice(0, 8);
}
