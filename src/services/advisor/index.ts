import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { NotificationSeverity, SaleStatus } from '@/generated/prisma/client';
import { getMonthlyReport, getTopSellingProducts, getSlowMovingProducts } from '@/services/reports';
import { getMonthlyRange } from '@/lib/utils/date-utils';

export type AdvisorFinding = {
  id: string;
  type:
    | 'OUT_OF_STOCK'
    | 'LOW_STOCK'
    | 'SLOW_MOVING'
    | 'HIGH_DEMAND'
    | 'SALES_DECLINE'
    | 'PROFIT_DECLINE'
    | 'CREDIT_RISK'
    | 'EXPENSE_SPIKE'
    | 'GROWTH_OPPORTUNITY';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO';
  title: string;
  message: string;
  recommendation: string;
  metric?: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  createdAt: Date;
};

export type HealthScoreBreakdown = {
  score: number;
  grade: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'CRITICAL';
  factors: {
    name: string;
    score: number;
    maxScore: number;
    status: 'GOOD' | 'WARNING' | 'ALERT';
    comment: string;
  }[];
};

export async function generateAdvisorFindings(
  businessId: string,
  timezone: string = 'Asia/Karachi'
): Promise<{
  findings: AdvisorFinding[];
  healthScore: HealthScoreBreakdown;
  summaryText: string;
}> {
  const findings: AdvisorFinding[] = [];
  const now = new Date();
  const currentMonth = getMonthlyRange(undefined, undefined, timezone);
  const periodKey = `${currentMonth.year}-${currentMonth.month}`;

  // 1. Fetch Monthly Performance & Inventory Data in Parallel
  const [
    monthlyData,
    products,
    slowProducts,
    topProducts,
    customerAggregate,
  ] = await Promise.all([
    getMonthlyReport(businessId, undefined, undefined, timezone),
    prisma.product.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minStockThreshold: true,
        purchasePrice: true,
        sellingPrice: true,
      },
    }),
    getSlowMovingProducts(businessId, { daysThreshold: 30, limit: 10 }),
    getTopSellingProducts(businessId, { limit: 10 }),
    prisma.customer.aggregate({
      where: { businessId, isActive: true },
      _sum: { outstanding: true },
      _count: { id: true },
    }),
  ]);

  const totalRevenue = monthlyData.summary.grossRevenue;
  const totalGrossProfit = monthlyData.summary.grossProfit;
  const totalExpenses = monthlyData.summary.expenses;
  const totalOutstanding = Number(customerAggregate._sum.outstanding || 0);

  // --- RULE 1: Out of Stock Alert ---
  const outOfStockProducts = products.filter((p) => p.currentStock <= 0);
  if (outOfStockProducts.length > 0) {
    findings.push({
      id: `out-of-stock-${periodKey}`,
      type: 'OUT_OF_STOCK',
      severity: 'CRITICAL',
      title: `${outOfStockProducts.length} Product${outOfStockProducts.length > 1 ? 's' : ''} Out of Stock`,
      message: `${outOfStockProducts.slice(0, 3).map((p) => p.name).join(', ')}${outOfStockProducts.length > 3 ? ` and ${outOfStockProducts.length - 3} others` : ''} have 0 stock.`,
      recommendation: 'Create a new purchase order immediately to prevent lost sales and maintain customer trust.',
      metric: `${outOfStockProducts.length} items`,
      relatedEntity: 'PRODUCT',
      createdAt: now,
    });
  }

  // --- RULE 2: Low Stock Warning ---
  const lowStockProducts = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStockThreshold
  );
  if (lowStockProducts.length > 0) {
    findings.push({
      id: `low-stock-${periodKey}`,
      type: 'LOW_STOCK',
      severity: 'WARNING',
      title: `${lowStockProducts.length} Product${lowStockProducts.length > 1 ? 's' : ''} Near Depletion`,
      message: `${lowStockProducts.slice(0, 3).map((p) => `${p.name} (${p.currentStock} left)`).join(', ')} are below their reorder threshold.`,
      recommendation: 'Review inventory levels and restock before shelves empty.',
      metric: `${lowStockProducts.length} items`,
      relatedEntity: 'PRODUCT',
      createdAt: now,
    });
  }

  // --- RULE 3: Slow-Moving Inventory ---
  if (slowProducts.length > 0) {
    const totalTiedUp = slowProducts.reduce((sum, p) => sum + p.stockValue, 0);
    findings.push({
      id: `slow-moving-${periodKey}`,
      type: 'SLOW_MOVING',
      severity: 'WARNING',
      title: 'Tied-up Capital in Slow-Moving Products',
      message: `Rs. ${Math.round(totalTiedUp).toLocaleString()} is tied up across ${slowProducts.length} active products with no sales in 30+ days.`,
      recommendation: 'Consider promoting or bundling items like ' + slowProducts.slice(0, 2).map((p) => p.name).join(' & ') + ' to free up working capital.',
      metric: `Rs. ${Math.round(totalTiedUp).toLocaleString()}`,
      relatedEntity: 'PRODUCT',
      createdAt: now,
    });
  }

  // --- RULE 4: Sales Trend (Decline or Growth) ---
  const revGrowth = monthlyData.growth.revenueGrowth;
  if (revGrowth.status === 'DOWN' && revGrowth.percentage !== null && revGrowth.percentage <= -15) {
    findings.push({
      id: `sales-decline-${periodKey}`,
      type: 'SALES_DECLINE',
      severity: 'CRITICAL',
      title: 'Monthly Revenue Decline',
      message: `Revenue is down ${Math.abs(revGrowth.percentage)}% compared with the previous month.`,
      recommendation: 'Review customer footfall, active stock availability for top products, and overall pricing.',
      metric: revGrowth.formatted,
      createdAt: now,
    });
  } else if (revGrowth.status === 'UP' && revGrowth.percentage !== null && revGrowth.percentage >= 20) {
    findings.push({
      id: `growth-opportunity-${periodKey}`,
      type: 'GROWTH_OPPORTUNITY',
      severity: 'OPPORTUNITY',
      title: 'Strong Revenue Growth Momentum',
      message: `Monthly revenue grew ${revGrowth.formatted} compared with the previous month.`,
      recommendation: 'Capitalize on this momentum by ensuring top sellers stay fully stocked and marketing your best categories.',
      metric: revGrowth.formatted,
      createdAt: now,
    });
  }

  // --- RULE 5: Gross Profit Margin Contraction ---
  const currentMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const prevRevenue = monthlyData.growth.revenueGrowth.previous;
  const prevProfit = monthlyData.growth.profitGrowth.previous;
  const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

  if (prevMargin > 0 && currentMargin < prevMargin - 5 && totalRevenue > 0) {
    const marginDiff = Math.round((prevMargin - currentMargin) * 10) / 10;
    findings.push({
      id: `profit-decline-${periodKey}`,
      type: 'PROFIT_DECLINE',
      severity: 'WARNING',
      title: 'Profit Margin Contraction',
      message: `Gross profit margin dropped by ${marginDiff}% (from ${prevMargin.toFixed(1)}% to ${currentMargin.toFixed(1)}%).`,
      recommendation: 'Review supplier purchase prices, recent product discounts, or shifts in customer product mix.',
      metric: `${currentMargin.toFixed(1)}% margin`,
      createdAt: now,
    });
  }

  // --- RULE 6: Customer Credit Exposure (Udhaar Risk) ---
  if (totalRevenue > 0 && totalOutstanding > totalRevenue * 0.35) {
    const creditRatio = Math.round((totalOutstanding / totalRevenue) * 100);
    findings.push({
      id: `credit-risk-${periodKey}`,
      type: 'CREDIT_RISK',
      severity: 'CRITICAL',
      title: 'High Customer Credit (Udhaar) Exposure',
      message: `Customer credit receivables (Rs. ${totalOutstanding.toLocaleString()}) represent ${creditRatio}% of your monthly sales.`,
      recommendation: 'Focus on collecting pending Khata balances from customers before extending large additional credit.',
      metric: `Rs. ${totalOutstanding.toLocaleString()}`,
      relatedEntity: 'CUSTOMER',
      createdAt: now,
    });
  }

  // --- RULE 7: Expense Category Spike ---
  if (monthlyData.expenseCategories.length > 0 && totalExpenses > 0) {
    const topExpense = monthlyData.expenseCategories[0];
    if (topExpense.percentage >= 40 && topExpense.amount >= 5000) {
      findings.push({
        id: `expense-spike-${periodKey}`,
        type: 'EXPENSE_SPIKE',
        severity: 'WARNING',
        title: `High Concentration in "${topExpense.category}" Expenses`,
        message: `"${topExpense.category}" accounts for ${topExpense.percentage}% (Rs. ${topExpense.amount.toLocaleString()}) of total monthly expenses.`,
        recommendation: `Audit ${topExpense.category} bills and operational outlays to optimize your business cost structure.`,
        metric: `Rs. ${topExpense.amount.toLocaleString()}`,
        relatedEntity: 'EXPENSE',
        createdAt: now,
      });
    }
  }

  // --- RULE 8: High Demand Top Performer ---
  if (topProducts.length > 0) {
    const topItem = topProducts[0];
    if (topItem.quantitySold >= 10) {
      findings.push({
        id: `high-demand-${topItem.productId}-${periodKey}`,
        type: 'HIGH_DEMAND',
        severity: 'OPPORTUNITY',
        title: `Fast Mover: ${topItem.name}`,
        message: `${topItem.name} generated Rs. ${Math.round(topItem.revenue).toLocaleString()} revenue (${topItem.quantitySold} ${topItem.unit} sold).`,
        recommendation: `Ensure continuous procurement so you never stock out of your best-performing product.`,
        metric: `${topItem.quantitySold} sold`,
        relatedEntity: 'PRODUCT',
        relatedEntityId: topItem.productId,
        createdAt: now,
      });
    }
  }

  // --- COMPUTE BUSINESS HEALTH SCORE (0..100) ---
  const healthScore = computeBusinessHealthScore({
    revenueGrowth: revGrowth.percentage,
    revenueStatus: revGrowth.status,
    grossMargin: currentMargin,
    totalProducts: products.length,
    outOfStockCount: outOfStockProducts.length,
    monthlyRevenue: totalRevenue,
    totalOutstanding,
    grossProfit: totalGrossProfit,
    expenses: totalExpenses,
  });

  // Sort findings: CRITICAL -> WARNING -> OPPORTUNITY -> INFO
  const severityOrder = { CRITICAL: 0, WARNING: 1, OPPORTUNITY: 2, INFO: 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const summaryText =
    findings.length === 0
      ? 'All business metrics look balanced with healthy inventory and stable margins.'
      : `${findings.filter((f) => f.severity === 'CRITICAL').length} critical alert(s) and ${findings.filter((f) => f.severity === 'WARNING').length} recommendation(s) detected.`;

  return {
    findings,
    healthScore,
    summaryText,
  };
}

/**
 * Deterministic Business Health Scorecard (0..100) across 5 weighted pillars.
 */
function computeBusinessHealthScore(metrics: {
  revenueGrowth: number | null;
  revenueStatus: string;
  grossMargin: number;
  totalProducts: number;
  outOfStockCount: number;
  monthlyRevenue: number;
  totalOutstanding: number;
  grossProfit: number;
  expenses: number;
}): HealthScoreBreakdown {
  const factors: HealthScoreBreakdown['factors'] = [];

  // Pillar 1: Sales Momentum (25 pts)
  let salesScore = 18;
  let salesComment = 'Stable sales baseline';
  let salesStatus: 'GOOD' | 'WARNING' | 'ALERT' = 'GOOD';

  if (metrics.revenueStatus === 'UP' && metrics.revenueGrowth !== null) {
    if (metrics.revenueGrowth >= 15) {
      salesScore = 25;
      salesComment = `Rapid growth (+${metrics.revenueGrowth.toFixed(1)}%)`;
    } else {
      salesScore = 22;
      salesComment = `Positive growth (+${metrics.revenueGrowth.toFixed(1)}%)`;
    }
  } else if (metrics.revenueStatus === 'DOWN' && metrics.revenueGrowth !== null) {
    if (metrics.revenueGrowth <= -20) {
      salesScore = 8;
      salesComment = `Significant contraction (${metrics.revenueGrowth.toFixed(1)}%)`;
      salesStatus = 'ALERT';
    } else {
      salesScore = 14;
      salesComment = `Moderate decline (${metrics.revenueGrowth.toFixed(1)}%)`;
      salesStatus = 'WARNING';
    }
  }
  factors.push({
    name: 'Sales Momentum',
    score: salesScore,
    maxScore: 25,
    status: salesStatus,
    comment: salesComment,
  });

  // Pillar 2: Gross Profit Margin (25 pts)
  let marginScore = 15;
  let marginComment = `${metrics.grossMargin.toFixed(1)}% margin`;
  let marginStatus: 'GOOD' | 'WARNING' | 'ALERT' = 'GOOD';

  if (metrics.grossMargin >= 25) {
    marginScore = 25;
    marginComment = `Healthy high margin (${metrics.grossMargin.toFixed(1)}%)`;
  } else if (metrics.grossMargin >= 15) {
    marginScore = 20;
    marginComment = `Standard retail margin (${metrics.grossMargin.toFixed(1)}%)`;
  } else if (metrics.grossMargin >= 8) {
    marginScore = 14;
    marginComment = `Thin gross margin (${metrics.grossMargin.toFixed(1)}%)`;
    marginStatus = 'WARNING';
  } else {
    marginScore = 6;
    marginComment = `Critically low margin (${metrics.grossMargin.toFixed(1)}%)`;
    marginStatus = 'ALERT';
  }
  factors.push({
    name: 'Profit Margin',
    score: marginScore,
    maxScore: 25,
    status: marginStatus,
    comment: marginComment,
  });

  // Pillar 3: Inventory Stock Availability (20 pts)
  let stockScore = 20;
  let stockComment = 'Full inventory available';
  let stockStatus: 'GOOD' | 'WARNING' | 'ALERT' = 'GOOD';

  if (metrics.totalProducts > 0) {
    const stockoutRatio = metrics.outOfStockCount / metrics.totalProducts;
    if (stockoutRatio === 0) {
      stockScore = 20;
      stockComment = '0 out-of-stock items';
    } else if (stockoutRatio <= 0.05) {
      stockScore = 16;
      stockComment = `${metrics.outOfStockCount} item(s) out of stock`;
      stockStatus = 'WARNING';
    } else if (stockoutRatio <= 0.15) {
      stockScore = 10;
      stockComment = `${metrics.outOfStockCount} item(s) out of stock (${Math.round(stockoutRatio * 100)}%)`;
      stockStatus = 'WARNING';
    } else {
      stockScore = 4;
      stockComment = `${metrics.outOfStockCount} item(s) out of stock (${Math.round(stockoutRatio * 100)}%)`;
      stockStatus = 'ALERT';
    }
  }
  factors.push({
    name: 'Inventory Health',
    score: stockScore,
    maxScore: 20,
    status: stockStatus,
    comment: stockComment,
  });

  // Pillar 4: Credit & Receivables Exposure (15 pts)
  let creditScore = 15;
  let creditComment = 'Low credit exposure';
  let creditStatus: 'GOOD' | 'WARNING' | 'ALERT' = 'GOOD';

  if (metrics.monthlyRevenue > 0) {
    const creditRatio = metrics.totalOutstanding / metrics.monthlyRevenue;
    if (creditRatio <= 0.15) {
      creditScore = 15;
      creditComment = `Udhaar is ${Math.round(creditRatio * 100)}% of monthly sales`;
    } else if (creditRatio <= 0.35) {
      creditScore = 11;
      creditComment = `Moderate credit outstanding (${Math.round(creditRatio * 100)}%)`;
      creditStatus = 'WARNING';
    } else {
      creditScore = 5;
      creditComment = `High credit risk (${Math.round(creditRatio * 100)}% of sales)`;
      creditStatus = 'ALERT';
    }
  }
  factors.push({
    name: 'Credit Risk Control',
    score: creditScore,
    maxScore: 15,
    status: creditStatus,
    comment: creditComment,
  });

  // Pillar 5: Expense Discipline (15 pts)
  let expScore = 15;
  let expComment = 'Controlled overheads';
  let expStatus: 'GOOD' | 'WARNING' | 'ALERT' = 'GOOD';

  if (metrics.grossProfit > 0) {
    const expRatio = metrics.expenses / metrics.grossProfit;
    if (expRatio <= 0.25) {
      expScore = 15;
      expComment = `Expenses consume ${Math.round(expRatio * 100)}% of gross profit`;
    } else if (expRatio <= 0.5) {
      expScore = 11;
      expComment = `Expenses consume ${Math.round(expRatio * 100)}% of gross profit`;
      expStatus = 'WARNING';
    } else {
      expScore = 5;
      expComment = `Expenses consume ${Math.round(expRatio * 100)}% of gross profit`;
      expStatus = 'ALERT';
    }
  }
  factors.push({
    name: 'Expense Discipline',
    score: expScore,
    maxScore: 15,
    status: expStatus,
    comment: expComment,
  });

  const totalScore = Math.min(
    100,
    Math.max(0, salesScore + marginScore + stockScore + creditScore + expScore)
  );

  let grade: HealthScoreBreakdown['grade'] = 'GOOD';
  if (totalScore >= 85) grade = 'EXCELLENT';
  else if (totalScore >= 70) grade = 'GOOD';
  else if (totalScore >= 50) grade = 'ATTENTION';
  else grade = 'CRITICAL';

  return {
    score: totalScore,
    grade,
    factors,
  };
}

/**
 * Emits deduplicated notifications for critical/warning advisor findings.
 */
export async function syncAdvisorNotifications(
  businessId: string,
  timezone: string = 'Asia/Karachi'
) {
  const { findings } = await generateAdvisorFindings(businessId, timezone);
  const highPriority = findings.filter(
    (f) => f.severity === 'CRITICAL' || f.severity === 'WARNING'
  );

  let createdCount = 0;

  for (const finding of highPriority) {
    const deduplicationKey = `${businessId}-${finding.type}-${finding.relatedEntityId || 'global'}-${finding.id}`;

    // Check if notification with this deduplicationKey already exists
    const existing = await prisma.notification.findFirst({
      where: {
        businessId,
        deduplicationKey,
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          businessId,
          type: finding.type,
          severity:
            finding.severity === 'CRITICAL'
              ? NotificationSeverity.ALERT
              : NotificationSeverity.WARNING,
          title: finding.title,
          message: `${finding.message} — ${finding.recommendation}`,
          isOwnerOnly: true,
          relatedEntity: finding.relatedEntity || null,
          relatedEntityId: finding.relatedEntityId || null,
          deduplicationKey,
        },
      });
      createdCount++;
    }
  }

  return { syncedFindings: highPriority.length, createdNotifications: createdCount };
}
