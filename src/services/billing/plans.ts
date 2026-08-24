import { prisma } from '@/lib/db/prisma';
import { STANDARD_FEATURES } from './features';
import { STANDARD_LIMITS } from './limits';
import { recordAuditLog } from '../audit';
import { SubscriptionStatus } from '@/generated/prisma/client';
import type { Plan, PlanFeature, PlanLimit } from '@/generated/prisma/client';

export type PlanWithRelations = Plan & {
  features: PlanFeature[];
  limits: PlanLimit[];
  _count: { subscriptions: number };
};

/**
 * Ensures that the standard FREE plan exists with all features enabled and unlimited usage.
 * Idempotent execution safe to run during application startup, seeds, or store creation.
 */
export async function ensureDefaultFreePlan() {
  let freePlan = await prisma.plan.findUnique({
    where: { code: 'FREE' },
    include: {
      features: true,
      limits: true,
    },
  });

  if (!freePlan) {
    freePlan = await prisma.plan.create({
      data: {
        code: 'FREE',
        name: 'Free Plan',
        description: 'Complete core retail management capabilities for single and multi-branch stores.',
        isActive: true,
        displayOrder: 0,
      },
      include: {
        features: true,
        limits: true,
      },
    });
  }

  // Seed missing features
  for (const feature of STANDARD_FEATURES) {
    const existing = freePlan.features.find((f) => f.featureKey === feature);
    if (!existing) {
      await prisma.planFeature.create({
        data: {
          planId: freePlan.id,
          featureKey: feature,
          isEnabled: true,
        },
      });
    }
  }

  // Seed missing limits with -1 (unlimited)
  for (const limitKey of Object.keys(STANDARD_LIMITS)) {
    const existing = freePlan.limits.find((l) => l.limitKey === limitKey);
    if (!existing) {
      await prisma.planLimit.create({
        data: {
          planId: freePlan.id,
          limitKey,
          limitValue: -1,
        },
      });
    }
  }

  return prisma.plan.findUniqueOrThrow({
    where: { id: freePlan.id },
    include: {
      features: true,
      limits: true,
    },
  });
}

/**
 * Retrieves the active subscription and plan details for a business.
 */
export async function getBusinessSubscription(businessId: string) {
  let subscription = await prisma.businessSubscription.findUnique({
    where: { businessId },
    include: {
      plan: {
        include: {
          features: true,
          limits: true,
        },
      },
    },
  });

  if (!subscription) {
    const freePlan = await ensureDefaultFreePlan();
    subscription = await prisma.businessSubscription.upsert({
      where: { businessId },
      update: { planId: freePlan.id, status: SubscriptionStatus.ACTIVE },
      create: {
        businessId,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        plan: {
          include: {
            features: true,
            limits: true,
          },
        },
      },
    });
  }

  const overrides = await prisma.businessEntitlement.findMany({
    where: { businessId },
  });

  return {
    subscription,
    plan: subscription.plan,
    overrides,
  };
}

/**
 * Platform Admin action: Assign a plan to a business.
 */
export async function assignPlanToBusiness(
  businessId: string,
  planCode: string,
  adminUserId?: string
) {
  const plan = await prisma.plan.findUnique({
    where: { code: planCode },
  });

  if (!plan) {
    throw new Error(`Plan with code "${planCode}" does not exist.`);
  }

  const updatedSubscription = await prisma.businessSubscription.upsert({
    where: { businessId },
    update: {
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
    },
    create: {
      businessId,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
    },
    include: {
      plan: true,
    },
  });

  if (adminUserId) {
    await recordAuditLog({
      businessId,
      userId: adminUserId,
      action: 'PLAN_ASSIGNED',
      entityType: 'Plan',
      entityId: plan.id,
      metadata: {
        planCode: plan.code,
        planName: plan.name,
      },
    });
  }

  return updatedSubscription;
}

/**
 * Lists all active plans available in the system.
 */
export async function listAvailablePlans(): Promise<PlanWithRelations[]> {
  await ensureDefaultFreePlan();

  return prisma.plan.findMany({
    where: { isActive: true },
    include: {
      features: true,
      limits: true,
      _count: {
        select: { subscriptions: true },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });
}
