import { requireActiveBusiness } from '@/lib/auth/guards';
import { listAvailablePlans } from '@/services/billing/plans';
import type { Metadata } from 'next';
import { PlansPageClient } from './plans-client';

export const metadata: Metadata = {
  title: 'Platform Plans & Feature Matrix | DukaanOS Admin',
  description: 'Internal platform plan definitions, feature flags, and standard quota thresholds.',
};

export default async function PlatformPlansPage() {
  const { membership } = await requireActiveBusiness();

  const isAuthorized = membership.role === 'OWNER';

  if (!isAuthorized) {
    return <PlansPageClient authorized={false} plans={[]} />;
  }

  const plans = await listAvailablePlans();

  return (
    <PlansPageClient
      authorized
      plans={plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        isActive: plan.isActive,
        subscriptionCount: plan._count.subscriptions,
        featureKeys: plan.features.map((f) => f.featureKey),
      }))}
    />
  );
}
