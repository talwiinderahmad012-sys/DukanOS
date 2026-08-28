import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import {
  getTopCustomers,
  getCustomerGrowth,
  getUdhaarAnalytics,
} from '@/services/analytics';
import { MembershipRole } from '@/generated/prisma/client';
import { CustomersAnalyticsClient } from './customers-analytics-client';

const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default async function CustomersAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role !== MembershipRole.OWNER && membership.role !== MembershipRole.MANAGER) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const preset = params.preset || 'thisMonth';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let periodKey = 'thisMonth';

  if (preset === 'custom' && params.start && params.end) {
    startDate = new Date(params.start);
    endDate = new Date(params.end);
    endDate.setHours(23, 59, 59, 999);
    periodKey = 'custom';
  } else {
    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        periodKey = 'today';
        break;
      case 'thisWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        periodKey = 'thisWeek';
        break;
      }
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        periodKey = 'lastMonth';
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        periodKey = 'thisYear';
        break;
    }
  }

  const period = { start: startDate, end: endDate, label: periodKey };

  const [topCustomers, customerGrowth, udhaar] = await Promise.all([
    getTopCustomers(business.id, 20, startDate, endDate),
    getCustomerGrowth(business.id, business.timezone || 'Asia/Karachi'),
    getUdhaarAnalytics(business.id, period, business.timezone || 'Asia/Karachi'),
  ]);

  const validPresets = ['today', 'thisWeek', 'thisMonth', 'lastMonth', 'thisYear'];
  const activePreset = periodKey === 'custom' ? 'custom' : validPresets.includes(periodKey) ? periodKey : 'thisMonth';

  return (
    <CustomersAnalyticsClient
      activePreset={activePreset}
      startValue={params.start || toInputDate(startDate)}
      endValue={params.end || toInputDate(endDate)}
      periodKey={activePreset === 'custom' ? 'custom' : activePreset}
      topCustomers={topCustomers.map(c => ({
        customerId: c.customerId,
        name: c.name,
        phone: c.phone,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        outstanding: c.outstanding,
      }))}
      customerGrowth={customerGrowth}
      udhaar={udhaar}
    />
  );
}
