import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { sendNotification } from '../notifications';
import { getWeeklyReport, getMonthlyReport } from './index';

export async function runScheduledReports() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  const activeBusinesses = await prisma.business.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, timezone: true },
  });

  let scheduled = 0;

  for (const business of activeBusinesses) {
    try {
      if (dayOfWeek === 1) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const dedupKey = `WEEKLY_REPORT-${business.id}-${weekStart.toISOString().split('T')[0]}`;

        const existing = await prisma.notification.findFirst({
          where: { businessId: business.id, deduplicationKey: dedupKey },
        });

        if (!existing) {
          const weekly = await getWeeklyReport(business.id, undefined, business.timezone);
          const summary = weekly.summary;
          await sendNotification({
            businessId: business.id,
            type: 'WEEKLY_REPORT',
            severity: 'INFO',
            title: `Weekly Business Report — ${weekly.weekStart.toISOString().slice(0, 10)}`,
            message: `Revenue: Rs. ${summary.grossRevenue.toLocaleString()} | Profit: Rs. ${summary.grossProfit.toLocaleString()} | Net: Rs. ${summary.netProfit.toLocaleString()} | Orders: ${summary.ordersCount}`,
            isOwnerOnly: true,
            deduplicationKey: dedupKey,
            actionUrl: '/dashboard/reports/weekly',
          });
          scheduled++;
        }
      }

      if (dayOfMonth === 1) {
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const dedupKey = `MONTHLY_REPORT-${business.id}-${monthKey}`;

        const existing = await prisma.notification.findFirst({
          where: { businessId: business.id, deduplicationKey: dedupKey },
        });

        if (!existing) {
          const monthly = await getMonthlyReport(business.id, now.getFullYear(), now.getMonth() + 1, business.timezone);
          const summary = monthly.summary;
          await sendNotification({
            businessId: business.id,
            type: 'MONTHLY_REPORT',
            severity: 'INFO',
            title: `Monthly Business Report — ${monthly.monthName} ${monthly.year}`,
            message: `Revenue: Rs. ${summary.grossRevenue.toLocaleString()} | Profit: Rs. ${summary.grossProfit.toLocaleString()} | Net: Rs. ${summary.netProfit.toLocaleString()} | Orders: ${summary.ordersCount}`,
            isOwnerOnly: true,
            deduplicationKey: dedupKey,
            actionUrl: '/dashboard/reports/monthly',
          });
          scheduled++;
        }
      }
    } catch (err) {
      console.error(`Scheduled report failed for business ${business.id}`, err);
    }
  }

  return { scheduled };
}
