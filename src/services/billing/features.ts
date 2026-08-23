import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { ensureDefaultFreePlan } from './plans';

export const STANDARD_FEATURES = [
  'POS',
  'INVENTORY',
  'PURCHASES',
  'CUSTOMERS',
  'UDHAAR',
  'REPORTS',
  'BUSINESS_ADVISOR',
  'EMPLOYEES',
  'OFFLINE_POS',
  'PWA',
  'WEB_PUSH',
  'MULTI_BRANCH',
  'MULTI_BUSINESS',
  'CCTV',
  'EXTERNAL_COMMUNICATION',
  'DATA_EXPORT',
  'ADVANCED_ANALYTICS',
] as const;

export type FeatureKey = (typeof STANDARD_FEATURES)[number];

/**
 * Server-authoritative check whether a business is entitled to use a specific feature.
 * Precedence: BusinessEntitlement Override -> PlanFeature definition -> Default Free Plan fallback.
 */
export async function canUseFeature(
  businessId: string,
  featureKey: FeatureKey | string
): Promise<boolean> {
  // 1. Check for specific BusinessEntitlement override
  const override = await prisma.businessEntitlement.findFirst({
    where: {
      businessId,
      featureKey,
    },
  });

  if (override && typeof override.isEnabled === 'boolean') {
    return override.isEnabled;
  }

  // 2. Resolve Active Business Subscription & Plan
  let subscription = await prisma.businessSubscription.findUnique({
    where: { businessId },
    include: {
      plan: {
        include: {
          features: true,
        },
      },
    },
  });

  // If no subscription assigned yet, ensure Free plan and link automatically
  if (!subscription) {
    const freePlan = await ensureDefaultFreePlan();
    subscription = await prisma.businessSubscription.upsert({
      where: { businessId },
      update: { planId: freePlan.id, status: 'ACTIVE' },
      create: {
        businessId,
        planId: freePlan.id,
        status: 'ACTIVE',
      },
      include: {
        plan: {
          include: {
            features: true,
          },
        },
      },
    });
  }

  // Check if subscription status is active
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
    return false;
  }

  // Check plan feature flag
  const planFeature = subscription.plan.features.find((f) => f.featureKey === featureKey);
  if (planFeature) {
    return planFeature.isEnabled;
  }

  // Default to true for standard core features in the free-first model
  return true;
}

/**
 * Resolves a dictionary of all standard features with boolean flags for the business.
 */
export async function getBusinessFeatureState(
  businessId: string
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};

  for (const feature of STANDARD_FEATURES) {
    result[feature] = await canUseFeature(businessId, feature);
  }

  return result;
}
