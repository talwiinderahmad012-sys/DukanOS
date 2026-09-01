import { requireActiveBusiness } from '@/lib/auth/guards';
import { getBusinessUsage } from '@/services/billing/limits';
import { UsageView } from '@/components/settings/usage-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resource Usage & Limits | DukaanOS',
  description: 'Monitor real-time database resource consumption and operational quotas.',
};

export default async function BusinessUsagePage() {
  const { business } = await requireActiveBusiness();
  const usage = await getBusinessUsage(business.id);

  return (
    <UsageView
      businessName={business.name}
      planName={usage.planName}
      metrics={usage.metrics.map((metric) => ({
        limitKey: metric.limitKey,
        label: metric.label,
        current: Number(metric.current),
        limit: Number(metric.limit),
        remaining: metric.remaining === null ? null : Number(metric.remaining),
        isUnlimited: metric.isUnlimited,
        isBlocked: metric.isBlocked,
      }))}
    />
  );
}
