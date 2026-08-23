import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { SaleStatus, PurchaseStatus } from '@/generated/prisma/client';
import {
  getTopProducts,
  getSlowMovingProducts,
  getDeadStock,
  getLowStockSummary,
  getInventoryValuation,
  getTopCustomers,
  getExpenseAnalytics,
  getPurchaseAnalytics,
  getBranchAnalytics,
  getEmployeePayrollAnalytics,
  getMonthlyGrowthTable,
  getSalesByPaymentMethod,
} from '@/services/analytics';
import { getSalesForecast, getBusinessGrowthIndicators } from '@/services/analytics/forecast';
import { getCustomerCohortAnalytics } from '@/services/analytics/cohorts';
import { getMonthlyRange } from '@/lib/utils/date-utils';

export type ReportType =
  | 'SALES'
  | 'PROFIT'
  | 'PURCHASES'
  | 'INVENTORY'
  | 'EXPENSES'
  | 'CUSTOMERS'
  | 'BRANCHES'
  | 'PAYROLL'
  | 'BUSINESS_GROWTH';

export type ReportOptions = {
  from: Date;
  to: Date;
  branchId?: string | null;
};

export type BaseReport = {
  type: ReportType;
  title: string;
  category: string;
  generatedAt: Date;
  dateRange: { from: string; to: string };
  branchId?: string | null;
  summary: Record<string, number | string | boolean | null>;
  rows: Record<string, unknown>[];
  totals: Record<string, number>;
};

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function generateBusinessReport(businessId: string, type: ReportType, options: ReportOptions): Promise<BaseReport> {
  const generatedAt = new Date();
  const bf = options.branchId && options.branchId.trim().length > 0 ? options.branchId : null;

  switch (type) {
    case 'SALES':
      return generateSalesReport(businessId, options, bf, generatedAt);
    case 'PROFIT':
      return generateProfitReport(businessId, options, bf, generatedAt);
    case 'PURCHASES':
      return generatePurchasesReport(businessId, options, bf, generatedAt);
    case 'INVENTORY':
      return generateInventoryReport(businessId, options, bf, generatedAt);
    case 'EXPENSES':
      return generateExpensesReport(businessId, options, bf, generatedAt);
    case 'CUSTOMERS':
      return generateCustomersReport(businessId, options, bf, generatedAt);
    case 'BRANCHES':
      return generateBranchesReport(businessId, options, bf, generatedAt);
    case 'PAYROLL':
      return generatePayrollReport(businessId, options, bf, generatedAt);
    case 'BUSINESS_GROWTH':
      return generateBusinessGrowthReport(businessId, options, bf, generatedAt);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

async function generateSalesReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const [salesAgg, itemsAgg, paymentsAgg, topProducts, paymentMethods] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: options.from, lte: options.to }, ...(branchId ? { branchId } : {}) },
      _sum: { total: true, paidAmount: true },
      _count: { id: true },
    }),
    prisma.saleItem.aggregate({
      where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: options.from, lte: options.to }, ...(branchId ? { branchId } : {}) } },
      _sum: { quantity: true, lineTotal: true, lineProfit: true },
    }),
    prisma.customerPayment.aggregate({
      where: { businessId, date: { gte: options.from, lte: options.to }, ...(branchId ? { sale: { branchId } } : {}) },
      _sum: { amount: true },
    }),
    getTopProducts(businessId, options.from, options.to, 20, 'revenue', branchId || undefined),
    getSalesByPaymentMethod(businessId, options.from, options.to, branchId || undefined),
  ]);

  const totalRevenue = Number(salesAgg._sum.total || 0);
  const totalPaid = Number(salesAgg._sum.paidAmount || 0);
  const creditGiven = Math.max(0, totalRevenue - totalPaid);
  const ordersCount = salesAgg._count.id;
  const avgOrderValue = ordersCount > 0 ? Math.round((totalRevenue / ordersCount) * 100) / 100 : 0;

  const rows: Record<string, unknown>[] = [
    ...(topProducts || []).map((p) => ({ name: p.name, sku: p.sku, quantitySold: p.quantitySold, revenue: p.revenue, profit: p.profit })),
    ...(paymentMethods || []).map((m) => ({ method: m.method, count: m.count, revenue: m.revenue, percentage: m.percentage })),
  ];

  return {
    type: 'SALES',
    title: 'Sales Report',
    category: 'Sales',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary: { totalRevenue, ordersCount, avgOrderValue, creditGiven, paymentsReceived: Number(paymentsAgg._sum.amount || 0), itemsSold: Number(itemsAgg._sum.quantity || 0) },
    rows,
    totals: { totalRevenue, ordersCount, avgOrderValue, creditGiven },
  };
}

async function generateProfitReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const [itemsAgg, expensesAgg] = await Promise.all([
    prisma.saleItem.aggregate({
      where: { sale: { businessId, status: SaleStatus.COMPLETED, saleDate: { gte: options.from, lte: options.to }, ...(branchId ? { branchId } : {}) } },
      _sum: { lineTotal: true, lineProfit: true },
    }),
    prisma.expense.aggregate({
      where: { businessId, date: { gte: options.from, lte: options.to }, ...(branchId ? { branchId } : {}) },
      _sum: { amount: true },
    }),
  ]);

  const grossRevenue = Number(itemsAgg._sum.lineTotal || 0);
  const grossProfit = Number(itemsAgg._sum.lineProfit || 0);
  const expenses = Number(expensesAgg._sum.amount || 0);
  const netProfit = grossProfit - expenses;
  const marginPct = grossRevenue > 0 ? Math.round((grossProfit / grossRevenue) * 1000) / 10 : 0;

  const bestProducts = await getTopProducts(businessId, options.from, options.to, 10, 'profit', branchId || undefined);

  return {
    type: 'PROFIT',
    title: 'Profit Report',
    category: 'Profit',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary: { grossRevenue, grossProfit, expenses, netProfit, marginPercent: marginPct },
    rows: (bestProducts || []).map((p) => ({ name: p.name, revenue: p.revenue, profit: p.profit, marginPercent: p.profitMarginPercent })),
    totals: { grossRevenue, grossProfit, expenses, netProfit, marginPercent: marginPct },
  };
}

async function generatePurchasesReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const analytics = await getPurchaseAnalytics(businessId, { start: options.from, end: options.to, label: 'Report' }, { start: options.from, end: options.to, label: 'Report' });
  const topSuppliers = analytics.topSuppliers || [];

  return {
    type: 'PURCHASES',
    title: 'Purchase Report',
    category: 'Purchases',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary: { totalSpend: analytics.totalSpend.current, orderCount: analytics.orderCount.current },
    rows: topSuppliers.map((s) => ({ name: s.name, totalSpend: s.totalSpend, purchaseCount: s.purchaseCount, lastPurchaseDate: s.lastPurchaseDate })),
    totals: { totalSpend: analytics.totalSpend.current, orderCount: analytics.orderCount.current },
  };
}

async function generateInventoryReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const [valuation, lowStock, slowMoving] = await Promise.all([
    getInventoryValuation(businessId),
    getLowStockSummary(businessId),
    getSlowMovingProducts(businessId, 30, 50),
  ]);

  const rows: Record<string, unknown>[] = [
    { metric: 'Total Units', value: valuation.totalUnits },
    { metric: 'Total Value', value: valuation.totalValue },
    { metric: 'Low Stock Value', value: valuation.lowStockValue },
    { metric: 'Dead Stock Value', value: valuation.deadStockValue },
    { metric: 'Out of Stock', value: lowStock.outOfStock },
    { metric: 'Critical Stock', value: lowStock.critical },
    { metric: 'Low Stock', value: lowStock.low },
    { metric: 'Healthy Stock', value: lowStock.healthy },
    ...(slowMoving || []).map((p) => ({ name: p.name, stock: p.currentStock, stockValue: p.stockValue, daysSinceLastSale: p.daysSinceLastSale })),
  ];

  return {
    type: 'INVENTORY',
    title: 'Inventory Valuation Report',
    category: 'Inventory',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary: { totalUnits: valuation.totalUnits, totalValue: valuation.totalValue, lowStockValue: valuation.lowStockValue, deadStockValue: valuation.deadStockValue, outOfStock: lowStock.outOfStock },
    rows,
    totals: { totalUnits: valuation.totalUnits, totalValue: valuation.totalValue },
  };
}

async function generateExpensesReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const period = { start: options.from, end: options.to, label: 'Report' };
  const analytics = await getExpenseAnalytics(businessId, period, period, branchId || undefined);

  const rows = (analytics.categories || []).map((c) => ({ category: c.category, amount: c.amount, percentage: c.percentage }));

  return {
    type: 'EXPENSES',
    title: 'Expense Report',
    category: 'Expenses',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary: { totalCurrent: analytics.totalCurrent, totalPrevious: analytics.totalPrevious, totalGrowth: analytics.totalGrowth.percentage, expenseCount: analytics.expenseCount },
    rows,
    totals: { totalCurrent: analytics.totalCurrent, totalPrevious: analytics.totalPrevious },
  };
}

async function generateCustomersReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const [topCustomers, cohort] = await Promise.all([
    getTopCustomers(businessId, 20, options.from, options.to),
    getCustomerCohortAnalytics(businessId, { monthsBack: 6, branchId: branchId || undefined }),
  ]);

  const rows: Record<string, unknown>[] = [
    ...(topCustomers || []).map((c: any) => ({ name: c.name, phone: c.phone, totalSpent: c.totalSpent, orders: c.orderCount, outstanding: c.outstanding, lastPurchase: c.lastPurchaseDate })),
    ...(cohort.rows || []).map((r: any) => ({ cohort: r.cohort, size: r.size, repeatRate: r.repeatPurchaseRate, revenue: r.totalRevenue })),
  ];

  return {
    type: 'CUSTOMERS',
    title: 'Customer & Udhaar Report',
    category: 'Customers',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary: { totalCohortCustomers: cohort.totalCustomers, overallRepeatRate: cohort.overallRepeatPurchaseRate },
    rows,
    totals: { totalCohortCustomers: cohort.totalCustomers },
  };
}

async function generateBranchesReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const branches = await getBranchAnalytics(businessId, options.from, options.to);
  const rows = (branches || []).map((b) => ({ name: b.branchName, code: b.branchCode, revenue: b.revenue, grossProfit: b.grossProfit, expenses: b.expenses, netProfit: b.netProfit, orders: b.orderCount }));

  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += Number(r.revenue) || 0;
      acc.grossProfit += Number(r.grossProfit) || 0;
      acc.expenses += Number(r.expenses) || 0;
      acc.netProfit += Number(r.netProfit) || 0;
      acc.orders += Number(r.orders) || 0;
      return acc;
    },
    { revenue: 0, grossProfit: 0, expenses: 0, netProfit: 0, orders: 0 }
  );

  return {
    type: 'BRANCHES',
    title: 'Branch Performance Report',
    category: 'Branches',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary: { branchCount: rows.length, ...totals },
    rows,
    totals,
  };
}

async function generatePayrollReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const period = { start: options.from, end: options.to, label: 'Report' };
  const analytics = await getEmployeePayrollAnalytics(businessId, period);

  const summary = {
    totalPayroll: analytics.totalPayroll,
    paidPayroll: analytics.paidPayroll,
    pendingPayroll: analytics.pendingPayroll,
    employeeCount: analytics.employeeCount,
    attendancePercentage: analytics.attendancePercentage ?? 0,
    leaveUsage: analytics.leaveUsage,
  };

  return {
    type: 'PAYROLL',
    title: 'Payroll Summary Report',
    category: 'Payroll',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary,
    rows: [],
    totals: { totalPayroll: analytics.totalPayroll, paidPayroll: analytics.paidPayroll, pendingPayroll: analytics.pendingPayroll, employeeCount: analytics.employeeCount, attendancePercentage: analytics.attendancePercentage ?? 0, leaveUsage: analytics.leaveUsage },
  };
}

async function generateBusinessGrowthReport(businessId: string, options: ReportOptions, branchId: string | null, generatedAt: Date): Promise<BaseReport> {
  const [monthlyTable, forecast, indicators] = await Promise.all([
    getMonthlyGrowthTable(businessId, options.from.getFullYear(), 'Asia/Karachi'),
    getSalesForecast(businessId, { branchId: branchId || undefined }),
    getBusinessGrowthIndicators(businessId, { branchId: branchId || undefined }),
  ]);

  const rows = monthlyTable.map((m) => ({
    month: m.monthName,
    revenue: m.revenue,
    grossProfit: m.grossProfit,
    expenses: m.expenses,
    netProfit: m.netProfit,
    orders: m.orders,
    growth: m.growthPercent,
  }));

  return {
    type: 'BUSINESS_GROWTH',
    title: 'Business Growth Report',
    category: 'Growth',
    generatedAt,
    dateRange: { from: toDateStr(options.from), to: toDateStr(options.to) },
    branchId: branchId || undefined,
    summary: {
      next7Days: forecast.next7Days,
      next30Days: forecast.next30Days,
      trend: forecast.trend,
      confidence: forecast.confidence,
      revenueDirection: indicators.revenue.direction,
      profitDirection: indicators.profit.direction,
      expenseDirection: indicators.expenses.direction,
    },
    rows,
    totals: { next7Days: forecast.next7Days, next30Days: forecast.next30Days },
  };
}
