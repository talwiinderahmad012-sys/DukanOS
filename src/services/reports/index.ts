import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { SaleStatus, PurchaseStatus } from '@/generated/prisma/client';
import {
  getDailyRange,
  getWeeklyRange,
  getMonthlyRange,
  getYearlyRange,
  calculateGrowth,
  GrowthResult,
} from '@/lib/utils/date-utils';

export type ReportFinancialSummary = {
  grossRevenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  ordersCount: number;
  creditGiven: number;
  paymentsReceived: number;
  purchaseSpend: number;
};

export async function getDailyReport(
  businessId: string,
  dateInput?: string | Date,
  timezone: string = 'Asia/Karachi'
) {
  const current = getDailyRange(dateInput, timezone);
  
  // Previous Day Range for Comparison
  const prevDate = new Date(current.start);
  prevDate.setDate(prevDate.getDate() - 1);
  const previous = getDailyRange(prevDate, timezone);

  const [
    sales,
    itemsAggregate,
    expensesAggregate,
    paymentsAggregate,
    purchasesAggregate,
    prevSales,
    prevItemsAggregate,
    prevExpensesAggregate,
  ] = await Promise.all([
    // Today's completed sales
    prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: current.start, lte: current.end },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { saleDate: 'desc' },
    }),
    // Today's Gross Profit from completed sale items
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          saleDate: { gte: current.start, lte: current.end },
        },
      },
      _sum: { lineProfit: true },
    }),
    // Today's Expenses
    prisma.expense.aggregate({
      where: {
        businessId,
        date: { gte: current.start, lte: current.end },
      },
      _sum: { amount: true },
    }),
    // Today's Customer Payments received
    prisma.customerPayment.aggregate({
      where: {
        businessId,
        date: { gte: current.start, lte: current.end },
      },
      _sum: { amount: true },
    }),
    // Today's Purchases
    prisma.purchase.aggregate({
      where: {
        businessId,
        status: PurchaseStatus.RECEIVED,
        purchaseDate: { gte: current.start, lte: current.end },
      },
      _sum: { total: true },
    }),
    // Yesterday's Sales
    prisma.sale.aggregate({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: previous.start, lte: previous.end },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Yesterday's Profit
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          saleDate: { gte: previous.start, lte: previous.end },
        },
      },
      _sum: { lineProfit: true },
    }),
    // Yesterday's Expenses
    prisma.expense.aggregate({
      where: {
        businessId,
        date: { gte: previous.start, lte: previous.end },
      },
      _sum: { amount: true },
    }),
  ]);

  // Compute Today Metrics
  const grossRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const grossProfit = Number(itemsAggregate._sum.lineProfit || 0);
  const expenses = Number(expensesAggregate._sum.amount || 0);
  const netProfit = grossProfit - expenses;
  const ordersCount = sales.length;

  const creditGiven = sales.reduce((sum, s) => {
    const total = Number(s.total);
    const paid = Number(s.paidAmount);
    return sum + Math.max(0, total - paid);
  }, 0);

  const paymentsReceived = Number(paymentsAggregate._sum.amount || 0);
  const purchaseSpend = Number(purchasesAggregate._sum.total || 0);

  // Compute Previous Day Metrics
  const prevRevenue = Number(prevSales._sum.total || 0);
  const prevProfit = Number(prevItemsAggregate._sum.lineProfit || 0);
  const prevExpenses = Number(prevExpensesAggregate._sum.amount || 0);
  const prevNetProfit = prevProfit - prevExpenses;
  const prevOrders = prevSales._count.id;

  // Hourly Breakdown (0..23)
  const hourlyData: { hour: number; label: string; revenue: number; orders: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
    hourlyData.push({ hour: h, label, revenue: 0, orders: 0 });
  }

  for (const sale of sales) {
    const saleHour = new Date(sale.saleDate).getHours();
    if (hourlyData[saleHour]) {
      hourlyData[saleHour].revenue += Number(sale.total);
      hourlyData[saleHour].orders += 1;
    }
  }

  // Top Products for Today
  const productMap = new Map<string, { id: string; name: string; sku?: string | null; unit: string; quantity: number; revenue: number; profit: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = productMap.get(item.productId) || {
        id: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        unit: item.product.unit,
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += Number(item.lineTotal);
      existing.profit += Number(item.lineProfit);
      productMap.set(item.productId, existing);
    }
  }

  const topProductsToday = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);

  return {
    date: current.dateStr,
    summary: {
      grossRevenue,
      grossProfit,
      expenses,
      netProfit,
      ordersCount,
      creditGiven,
      paymentsReceived,
      purchaseSpend,
    },
    growth: {
      revenueGrowth: calculateGrowth(grossRevenue, prevRevenue),
      profitGrowth: calculateGrowth(grossProfit, prevProfit),
      netProfitGrowth: calculateGrowth(netProfit, prevNetProfit),
      ordersGrowth: calculateGrowth(ordersCount, prevOrders),
    },
    hourlyData,
    topProductsToday,
    sales,
  };
}

export async function getWeeklyReport(
  businessId: string,
  dateInput?: string | Date,
  timezone: string = 'Asia/Karachi'
) {
  const current = getWeeklyRange(dateInput, timezone);

  // Previous week range
  const prevMonday = new Date(current.start);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const previous = getWeeklyRange(prevMonday, timezone);

  const [
    sales,
    itemsAggregate,
    expenses,
    paymentsAggregate,
    prevSales,
    prevItemsAggregate,
    prevExpenses,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: current.start, lte: current.end },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          saleDate: { gte: current.start, lte: current.end },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.expense.findMany({
      where: {
        businessId,
        date: { gte: current.start, lte: current.end },
      },
    }),
    prisma.customerPayment.aggregate({
      where: {
        businessId,
        date: { gte: current.start, lte: current.end },
      },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: previous.start, lte: previous.end },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          saleDate: { gte: previous.start, lte: previous.end },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.expense.aggregate({
      where: {
        businessId,
        date: { gte: previous.start, lte: previous.end },
      },
      _sum: { amount: true },
    }),
  ]);

  const grossRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const grossProfit = Number(itemsAggregate._sum.lineProfit || 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = grossProfit - totalExpenses;
  const ordersCount = sales.length;

  const prevRevenue = Number(prevSales._sum.total || 0);
  const prevProfit = Number(prevItemsAggregate._sum.lineProfit || 0);
  const prevExp = Number(prevExpenses._sum.amount || 0);
  const prevNetProfit = prevProfit - prevExp;

  // Day-by-Day breakdown
  const dayBreakdown = current.days.map((d) => {
    const dayStart = new Date(d.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d.date);
    dayEnd.setHours(23, 59, 59, 999);

    const daySales = sales.filter(
      (s) => s.saleDate >= dayStart && s.saleDate <= dayEnd
    );
    const dayExpenses = expenses.filter(
      (e) => e.date >= dayStart && e.date <= dayEnd
    );

    const dayRev = daySales.reduce((sum, s) => sum + Number(s.total), 0);
    const dayProf = daySales.reduce(
      (sum, s) =>
        sum + s.items.reduce((iSum, i) => iSum + Number(i.lineProfit), 0),
      0
    );
    const dayExp = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      dateStr: d.dateStr,
      dayName: d.dayName,
      revenue: dayRev,
      grossProfit: dayProf,
      expenses: dayExp,
      netProfit: dayProf - dayExp,
      orders: daySales.length,
    };
  });

  return {
    weekStart: current.start,
    weekEnd: current.end,
    summary: {
      grossRevenue,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      ordersCount,
      paymentsReceived: Number(paymentsAggregate._sum.amount || 0),
    },
    growth: {
      revenueGrowth: calculateGrowth(grossRevenue, prevRevenue),
      profitGrowth: calculateGrowth(grossProfit, prevProfit),
      netProfitGrowth: calculateGrowth(netProfit, prevNetProfit),
      ordersGrowth: calculateGrowth(ordersCount, prevSales._count.id),
    },
    dayBreakdown,
  };
}

export async function getMonthlyReport(
  businessId: string,
  yearInput?: number,
  monthInput?: number,
  timezone: string = 'Asia/Karachi'
) {
  const current = getMonthlyRange(yearInput, monthInput, timezone);

  // Previous month
  const prevMonth = current.month === 1 ? 12 : current.month - 1;
  const prevYear = current.month === 1 ? current.year - 1 : current.year;
  const previous = getMonthlyRange(prevYear, prevMonth, timezone);

  const [
    sales,
    itemsAggregate,
    expenses,
    purchasesAggregate,
    prevSales,
    prevItemsAggregate,
    prevExpenses,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: current.start, lte: current.end },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          saleDate: { gte: current.start, lte: current.end },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.expense.findMany({
      where: {
        businessId,
        date: { gte: current.start, lte: current.end },
      },
    }),
    prisma.purchase.aggregate({
      where: {
        businessId,
        status: PurchaseStatus.RECEIVED,
        purchaseDate: { gte: current.start, lte: current.end },
      },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: previous.start, lte: previous.end },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          saleDate: { gte: previous.start, lte: previous.end },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.expense.aggregate({
      where: {
        businessId,
        date: { gte: previous.start, lte: previous.end },
      },
      _sum: { amount: true },
    }),
  ]);

  const grossRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const grossProfit = Number(itemsAggregate._sum.lineProfit || 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = grossProfit - totalExpenses;
  const ordersCount = sales.length;

  const prevRevenue = Number(prevSales._sum.total || 0);
  const prevProfit = Number(prevItemsAggregate._sum.lineProfit || 0);
  const prevExp = Number(prevExpenses._sum.amount || 0);
  const prevNetProfit = prevProfit - prevExp;

  // Daily Trend throughout the month
  const dailyData: { day: number; dateStr: string; revenue: number; profit: number; expenses: number }[] = [];
  for (let d = 1; d <= current.daysInMonth; d++) {
    const dayStart = new Date(current.year, current.month - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(current.year, current.month - 1, d, 23, 59, 59, 999);

    const dSales = sales.filter((s) => s.saleDate >= dayStart && s.saleDate <= dayEnd);
    const dExpenses = expenses.filter((e) => e.date >= dayStart && e.date <= dayEnd);

    const rev = dSales.reduce((sum, s) => sum + Number(s.total), 0);
    const prof = dSales.reduce(
      (sum, s) =>
        sum + s.items.reduce((iSum, i) => iSum + Number(i.lineProfit), 0),
      0
    );
    const exp = dExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    dailyData.push({
      day: d,
      dateStr: `${current.year}-${String(current.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      revenue: rev,
      profit: prof,
      expenses: exp,
    });
  }

  // Expense Categories breakdown
  const expenseCategoryMap = new Map<string, number>();
  for (const exp of expenses) {
    const cur = expenseCategoryMap.get(exp.category) || 0;
    expenseCategoryMap.set(exp.category, cur + Number(exp.amount));
  }
  const expenseCategories = Array.from(expenseCategoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0,
  })).sort((a, b) => b.amount - a.amount);

  return {
    year: current.year,
    month: current.month,
    monthName: new Date(current.year, current.month - 1, 1).toLocaleString('default', { month: 'long' }),
    summary: {
      grossRevenue,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      ordersCount,
      purchaseSpend: Number(purchasesAggregate._sum.total || 0),
    },
    growth: {
      revenueGrowth: calculateGrowth(grossRevenue, prevRevenue),
      profitGrowth: calculateGrowth(grossProfit, prevProfit),
      netProfitGrowth: calculateGrowth(netProfit, prevNetProfit),
      ordersGrowth: calculateGrowth(ordersCount, prevSales._count.id),
    },
    dailyData,
    expenseCategories,
  };
}

export async function getYearlyReport(
  businessId: string,
  yearInput?: number,
  timezone: string = 'Asia/Karachi'
) {
  const current = getYearlyRange(yearInput, timezone);
  const previous = getYearlyRange(current.year - 1, timezone);

  const [sales, itemsAggregate, expenses, purchasesAggregate, prevSales, prevItemsAggregate, prevExpenses] = await Promise.all([
    prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: current.start, lte: current.end },
      },
      select: {
        total: true,
        saleDate: true,
        items: { select: { lineProfit: true } },
      },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          saleDate: { gte: current.start, lte: current.end },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.expense.findMany({
      where: {
        businessId,
        date: { gte: current.start, lte: current.end },
      },
      select: { amount: true, date: true },
    }),
    prisma.purchase.aggregate({
      where: {
        businessId,
        status: PurchaseStatus.RECEIVED,
        purchaseDate: { gte: current.start, lte: current.end },
      },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: previous.start, lte: previous.end },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          saleDate: { gte: previous.start, lte: previous.end },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.expense.aggregate({
      where: {
        businessId,
        date: { gte: previous.start, lte: previous.end },
      },
      _sum: { amount: true },
    }),
  ]);

  const grossRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const grossProfit = Number(itemsAggregate._sum.lineProfit || 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = grossProfit - totalExpenses;
  const ordersCount = sales.length;

  const prevRevenue = Number(prevSales._sum.total || 0);
  const prevProfit = Number(prevItemsAggregate._sum.lineProfit || 0);
  const prevExp = Number(prevExpenses._sum.amount || 0);
  const prevNetProfit = prevProfit - prevExp;

  // 12-Month breakdown
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = monthNames.map((name, idx) => {
    const monthStart = new Date(current.year, idx, 1, 0, 0, 0, 0);
    const monthEnd = new Date(current.year, idx + 1, 0, 23, 59, 59, 999);

    const mSales = sales.filter((s) => s.saleDate >= monthStart && s.saleDate <= monthEnd);
    const mExpenses = expenses.filter((e) => e.date >= monthStart && e.date <= monthEnd);

    const rev = mSales.reduce((sum, s) => sum + Number(s.total), 0);
    const prof = mSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, i) => iSum + Number(i.lineProfit), 0),
      0
    );
    const exp = mExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      month: idx + 1,
      monthName: name,
      revenue: rev,
      grossProfit: prof,
      expenses: exp,
      netProfit: prof - exp,
      orders: mSales.length,
    };
  });

  return {
    year: current.year,
    summary: {
      grossRevenue,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      ordersCount,
      purchaseSpend: Number(purchasesAggregate._sum.total || 0),
    },
    growth: {
      revenueGrowth: calculateGrowth(grossRevenue, prevRevenue),
      profitGrowth: calculateGrowth(grossProfit, prevProfit),
      netProfitGrowth: calculateGrowth(netProfit, prevNetProfit),
      ordersGrowth: calculateGrowth(ordersCount, prevSales._count.id),
    },
    monthlyData,
  };
}

export async function getTopSellingProducts(
  businessId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    sortBy?: 'quantity' | 'revenue' | 'profit';
  } = {}
) {
  const limit = options.limit || 10;
  const sortBy = options.sortBy || 'quantity';

  const whereSale: any = {
    businessId,
    status: SaleStatus.COMPLETED,
  };

  if (options.startDate || options.endDate) {
    whereSale.saleDate = {};
    if (options.startDate) whereSale.saleDate.gte = options.startDate;
    if (options.endDate) whereSale.saleDate.lte = options.endDate;
  }

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: whereSale,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          currentStock: true,
          sellingPrice: true,
        },
      },
    },
  });

  const productMap = new Map<
    string,
    {
      productId: string;
      name: string;
      sku?: string | null;
      unit: string;
      currentStock: number;
      quantitySold: number;
      revenue: number;
      profit: number;
    }
  >();

  for (const item of saleItems) {
    const existing = productMap.get(item.productId) || {
      productId: item.productId,
      name: item.product.name,
      sku: item.product.sku,
      unit: item.product.unit,
      currentStock: item.product.currentStock,
      quantitySold: 0,
      revenue: 0,
      profit: 0,
    };

    existing.quantitySold += item.quantity;
    existing.revenue += Number(item.lineTotal);
    existing.profit += Number(item.lineProfit);
    productMap.set(item.productId, existing);
  }

  const list = Array.from(productMap.values());

  if (sortBy === 'revenue') {
    list.sort((a, b) => b.revenue - a.revenue);
  } else if (sortBy === 'profit') {
    list.sort((a, b) => b.profit - a.profit);
  } else {
    list.sort((a, b) => b.quantitySold - a.quantitySold);
  }

  return list.slice(0, limit);
}

export async function getSlowMovingProducts(
  businessId: string,
  options: {
    daysThreshold?: number;
    limit?: number;
  } = {}
) {
  const daysThreshold = options.daysThreshold || 30;
  const limit = options.limit || 20;

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  // 1. Fetch active products with stock > 0
  const activeProducts = await prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
      currentStock: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      currentStock: true,
      purchasePrice: true,
      sellingPrice: true,
      createdAt: true,
    },
  });

  // 2. Fetch sales for these products within the threshold date
  const recentSaleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        businessId,
        status: SaleStatus.COMPLETED,
        saleDate: { gte: thresholdDate },
      },
    },
    select: {
      productId: true,
    },
  });

  const soldProductIds = new Set(recentSaleItems.map((item) => item.productId));

  // 3. Filter products that had NO sales in threshold
  const slowProducts = activeProducts
    .filter((product) => !soldProductIds.has(product.id))
    .map((product) => {
      const stockValue = Number(product.purchasePrice) * product.currentStock;
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        currentStock: product.currentStock,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        stockValue,
        daysWithoutSale: daysThreshold,
      };
    })
    .sort((a, b) => b.stockValue - a.stockValue); // Rank by tied-up capital

  return slowProducts.slice(0, limit);
}

export async function getBusinessGrowth(
  businessId: string,
  period: 'DAILY' | 'MONTHLY' | 'YEARLY' = 'MONTHLY',
  timezone: string = 'Asia/Karachi'
) {
  if (period === 'DAILY') {
    const todayReport = await getDailyReport(businessId, undefined, timezone);
    return {
      period: 'Day-over-Day (Today vs Yesterday)',
      ...todayReport.growth,
      currentRevenue: todayReport.summary.grossRevenue,
      currentProfit: todayReport.summary.grossProfit,
      currentOrders: todayReport.summary.ordersCount,
    };
  }

  if (period === 'YEARLY') {
    const yearlyReport = await getYearlyReport(businessId, undefined, timezone);
    return {
      period: 'Year-over-Year (This Year vs Last Year)',
      ...yearlyReport.growth,
      currentRevenue: yearlyReport.summary.grossRevenue,
      currentProfit: yearlyReport.summary.grossProfit,
      currentOrders: yearlyReport.summary.ordersCount,
    };
  }

  // Default: Monthly
  const monthlyReport = await getMonthlyReport(businessId, undefined, undefined, timezone);
  return {
    period: 'Month-over-Month (This Month vs Last Month)',
    ...monthlyReport.growth,
    currentRevenue: monthlyReport.summary.grossRevenue,
    currentProfit: monthlyReport.summary.grossProfit,
    currentOrders: monthlyReport.summary.ordersCount,
  };
}

export {
  generateBusinessReport,
  type ReportType,
  type ReportOptions,
  type BaseReport,
} from './business-reports';

export { getBranchAnalytics } from '@/services/analytics';
