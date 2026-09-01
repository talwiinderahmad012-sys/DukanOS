import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { sendNotification } from '../notifications';
import { getWeeklyReport, getMonthlyReport } from './index';
import {
  getDateComponentsInTimezone,
  getWeeklyRange,
  getMonthlyRange,
} from '@/lib/utils/date-utils';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calendar parts of an instant in the business timezone, including the
 * weekday of the local calendar date (0 = Sunday ... 6 = Saturday).
 */
export function getTzCalendarParts(date: Date, timezone: string) {
  const parts = getDateComponentsInTimezone(date, timezone);
  const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return { ...parts, dayOfWeek };
}

/**
 * Weekly digest period (P2-04): the most recently COMPLETED Monday-start
 * reporting week in the business timezone. Probing one week back from `now`
 * resolves to the previous week on any weekday, so a late/retried dispatch
 * during the current week still reports the completed week.
 */
export function getScheduledWeeklyPeriod(now: Date, timezone: string) {
  const currentWeek = getWeeklyRange(now, timezone);
  return getWeeklyRange(new Date(currentWeek.start.getTime() - 1), timezone);
}

/**
 * The year/month of the most recently COMPLETED month in the business
 * timezone (used by the monthly digest on day 1).
 */
export function getPreviousMonthParts(now: Date, timezone: string): { year: number; month: number } {
  const parts = getDateComponentsInTimezone(now, timezone);
  return parts.month === 1
    ? { year: parts.year - 1, month: 12 }
    : { year: parts.year, month: parts.month - 1 };
}

export async function runScheduledReports() {
  const now = new Date();

  const activeBusinesses = await prisma.business.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, timezone: true },
  });

  let scheduled = 0;

  for (const business of activeBusinesses) {
    try {
      // All trigger gates and period boundaries use the business timezone,
      // never the server-local clock.
      const cal = getTzCalendarParts(now, business.timezone);

      // Weekly digest: Monday (business tz), reporting the completed week.
      if (cal.dayOfWeek === 1) {
        const period = getScheduledWeeklyPeriod(now, business.timezone);
        const weekKey = period.days[0].dateStr;
        const dedupKey = `WEEKLY_REPORT-${business.id}-${weekKey}`;

        const existing = await prisma.notification.findFirst({
          where: { businessId: business.id, deduplicationKey: dedupKey },
        });

        if (!existing) {
          const weekly = await getWeeklyReport(business.id, period.start, business.timezone);
          const summary = weekly.summary;
          await sendNotification({
            businessId: business.id,
            type: 'WEEKLY_REPORT',
            severity: 'INFO',
            title: `Weekly Business Report — ${weekKey}`,
            message: `Revenue: Rs. ${summary.grossRevenue.toLocaleString()} | Profit: Rs. ${summary.grossProfit.toLocaleString()} | Net: Rs. ${summary.netProfit.toLocaleString()} | Orders: ${summary.ordersCount}`,
            isOwnerOnly: true,
            deduplicationKey: dedupKey,
            actionUrl: '/dashboard/reports/weekly',
          });
          scheduled++;
        }
      }

      // Monthly digest: day 1 (business tz), reporting the completed month.
      if (cal.day === 1) {
        const prev = getPreviousMonthParts(now, business.timezone);
        const monthKey = `${prev.year}-${String(prev.month).padStart(2, '0')}`;
        const dedupKey = `MONTHLY_REPORT-${business.id}-${monthKey}`;

        const existing = await prisma.notification.findFirst({
          where: { businessId: business.id, deduplicationKey: dedupKey },
        });

        if (!existing) {
          const monthly = await getMonthlyReport(business.id, prev.year, prev.month, business.timezone);
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
      // Log safely: never include business data in the error line.
      console.error(`Scheduled report failed for business ${business.id}`, err instanceof Error ? err.message : err);
    }
  }

  return { scheduled };
}
