import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { sendNotification } from './notifications';
import { getRemoteBusinessStatus } from './monitoring';

export async function generateDailyBusinessDigest(
  businessId: string,
  targetDate?: Date
) {
  // 1. Fetch Business Details
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, currency: true, timezone: true },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  // 2. Compute Yesterday & Day-Before Range in Business Timezone
  const refDate = targetDate ? new Date(targetDate) : new Date();
  
  // Yesterday Range (00:00:00 to 23:59:59)
  const yesterdayStart = new Date(refDate);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);

  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setHours(23, 59, 59, 999);

  // Day Before Yesterday Range
  const prevDayStart = new Date(yesterdayStart);
  prevDayStart.setDate(prevDayStart.getDate() - 1);
  prevDayStart.setHours(0, 0, 0, 0);

  const prevDayEnd = new Date(prevDayStart);
  prevDayEnd.setHours(23, 59, 59, 999);

  const dateStr = yesterdayStart.toISOString().slice(0, 10);
  const deduplicationKey = `DAILY_DIGEST-${businessId}-${dateStr}`;

  // 3. Check Idempotency: Don't recreate or resend if already generated for this date
  const existing = await prisma.notification.findFirst({
    where: {
      businessId,
      deduplicationKey,
    },
  });

  if (existing) {
    return {
      created: false,
      notification: existing,
      summary: 'Digest already generated for this date.',
    };
  }

  // 4. Query Yesterday's Metrics
  const [yesterdaySales, yesterdayProfit, prevDaySales, operationalStatus] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          businessId,
          status: 'COMPLETED',
          saleDate: { gte: yesterdayStart, lte: yesterdayEnd },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.saleItem.aggregate({
        where: {
          sale: {
            businessId,
            status: 'COMPLETED',
            saleDate: { gte: yesterdayStart, lte: yesterdayEnd },
          },
        },
        _sum: { lineProfit: true },
      }),
      prisma.sale.aggregate({
        where: {
          businessId,
          status: 'COMPLETED',
          saleDate: { gte: prevDayStart, lte: prevDayEnd },
        },
        _sum: { total: true },
      }),
      getRemoteBusinessStatus(businessId),
    ]);

  const salesTotal = Number(yesterdaySales._sum.total || 0);
  const orderCount = yesterdaySales._count.id;
  const grossProfit = Number(yesterdayProfit._sum.lineProfit || 0);
  const prevSalesTotal = Number(prevDaySales._sum.total || 0);

  let growthPct = 0;
  if (prevSalesTotal > 0) {
    growthPct = Math.round(((salesTotal - prevSalesTotal) / prevSalesTotal) * 100);
  }

  // 5. Construct Digest Message
  const currency = business.currency || 'PKR';
  const growthStr =
    prevSalesTotal > 0
      ? `${growthPct >= 0 ? '+' : ''}${growthPct}% compared to previous day`
      : 'First day recording';

  const alertHighlights: string[] = [];
  if (operationalStatus.actionCenter.lowStockCount > 0) {
    alertHighlights.push(`• ${operationalStatus.actionCenter.lowStockCount} products are low on stock.`);
  }
  if (operationalStatus.actionCenter.pendingLeavesCount > 0) {
    alertHighlights.push(`• ${operationalStatus.actionCenter.pendingLeavesCount} employee leave requests awaiting approval.`);
  }
  if (operationalStatus.actionCenter.newLowFeedbacksCount > 0) {
    alertHighlights.push(`• ${operationalStatus.actionCenter.newLowFeedbacksCount} low customer reviews received.`);
  }

  const messageBody = `
📊 **Yesterday's Performance (${dateStr})**:
• Total Sales: ${currency} ${salesTotal.toLocaleString()} (${orderCount} orders)
• Gross Profit: ${currency} ${grossProfit.toLocaleString()}
• Revenue Growth: ${growthStr}

⚠️ **Operational Status**:
${alertHighlights.length > 0 ? alertHighlights.join('\n') : '• All inventory and staff operations running smoothly.'}

💡 **Recommendation**:
${
  operationalStatus.actionCenter.lowStockCount > 0
    ? 'Place inventory reorders to prevent product stockouts.'
    : 'Review yesterday’s top performing product categories in Reports.'
}
  `.trim();

  // 6. Send In-App & Web Push Notification
  const notification = await sendNotification({
    businessId,
    type: 'DAILY_DIGEST',
    severity: 'INFO',
    title: `Daily Business Digest — ${dateStr}`,
    message: messageBody,
    isOwnerOnly: true,
    deduplicationKey,
    actionUrl: '/dashboard/reports/daily',
  });

  return {
    created: true,
    notification,
    summary: `Daily digest successfully dispatched for ${dateStr}.`,
  };
}
