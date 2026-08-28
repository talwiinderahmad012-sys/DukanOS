import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getBusinessSubscription } from '@/services/billing/plans';
import { STANDARD_FEATURES } from '@/services/billing/features';
import { PlanView } from '@/components/settings/plan-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plan & Subscription | DukaanOS',
  description: 'View your store plan entitlements, active tier, and core retail capabilities.',
};

export default async function BusinessPlanPage() {
  const { business } = await getActiveBusiness();
  const { plan, subscription } = await getBusinessSubscription(business.id);

  return (
    <PlanView
      businessName={business.name}
      planCode={plan.code}
      planName={plan.name}
      planDescription={plan.description}
      subscriptionStatus={subscription.status}
      features={[...STANDARD_FEATURES]}
    />
  );
}
