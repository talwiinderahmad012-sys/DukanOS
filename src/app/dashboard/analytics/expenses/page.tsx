import { requireActiveBusiness } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { getExpenseAnalytics } from '@/services/analytics';
import { ExpensesAnalyticsClient } from './expenses-analytics-client';

export default async function ExpensesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = params.preset || 'thisMonth';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let periodKey = 'thisMonth';
  let prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  let prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  if (preset === 'lastMonth') {
    startDate = prevStart;
    endDate = prevEnd;
    periodKey = 'lastMonth';
  } else if (preset === 'thisYear') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    periodKey = 'thisYear';
    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  }

  const expenseAnalytics = await getExpenseAnalytics(
    business.id,
    { start: startDate, end: endDate, label: periodKey },
    { start: prevStart, end: prevEnd, label: 'previous' }
  );

  return (
    <ExpensesAnalyticsClient
      periodKey={periodKey}
      data={{
        totalCurrent: expenseAnalytics.totalCurrent,
        totalPrevious: expenseAnalytics.totalPrevious,
        totalGrowth: {
          status: expenseAnalytics.totalGrowth.status,
          percentage: expenseAnalytics.totalGrowth.percentage,
        },
        categories: expenseAnalytics.categories,
        expenseCount: expenseAnalytics.expenseCount,
      }}
    />
  );
}
