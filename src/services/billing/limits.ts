import { prisma } from '@/lib/db/prisma';
import { getBusinessSubscription } from './plans';

export const STANDARD_LIMITS = {
  MAX_BRANCHES: 'Maximum Branches / Outlets',
  MAX_USERS: 'Maximum Team Staff Members',
  MAX_PRODUCTS: 'Maximum Active Catalog Products',
  MAX_CUSTOMERS: 'Maximum Registered Customers',
  MAX_MONTHLY_SALES: 'Monthly Completed POS Invoices',
  MAX_CCTV_CAMERAS: 'Configured CCTV Camera Channels',
  MAX_EXTERNAL_MESSAGES: 'Monthly External Messages (WhatsApp/SMS)',
} as const;

export type LimitKey = keyof typeof STANDARD_LIMITS;

export interface UsageMetric {
  limitKey: LimitKey;
  label: string;
  current: number;
  limit: number; // -1 for unlimited
  remaining: number | null; // null if unlimited
  isUnlimited: boolean;
  isBlocked: boolean;
}

/**
 * Calculates current month start timestamp in UTC for accurate monthly quota tracking.
 */
function getStartOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Computes live database usage across all standard resource dimensions for a business.
 */
export async function getBusinessUsage(businessId: string): Promise<{
  businessId: string;
  planName: string;
  metrics: UsageMetric[];
}> {
  const { plan, overrides } = await getBusinessSubscription(businessId);
  const startOfMonth = getStartOfCurrentMonth();

  const [
    branchesCount,
    usersCount,
    productsCount,
    customersCount,
    monthlySalesCount,
    camerasCount,
    monthlyMessagesCount,
  ] = await Promise.all([
    prisma.branch.count({ where: { businessId, status: 'ACTIVE' } }),
    prisma.businessMembership.count({ where: { businessId } }),
    prisma.product.count({ where: { businessId, isActive: true } }),
    prisma.customer.count({ where: { businessId, isActive: true } }),
    prisma.sale.count({
      where: {
        businessId,
        status: 'COMPLETED',
        saleDate: { gte: startOfMonth },
      },
    }),
    prisma.camera.count({ where: { businessId, isArchived: false } }),
    prisma.communicationMessage.count({
      where: {
        businessId,
        status: 'DELIVERED',
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  const countsMap: Record<LimitKey, number> = {
    MAX_BRANCHES: branchesCount,
    MAX_USERS: usersCount,
    MAX_PRODUCTS: productsCount,
    MAX_CUSTOMERS: customersCount,
    MAX_MONTHLY_SALES: monthlySalesCount,
    MAX_CCTV_CAMERAS: camerasCount,
    MAX_EXTERNAL_MESSAGES: monthlyMessagesCount,
  };

  const metrics: UsageMetric[] = [];

  for (const [key, label] of Object.entries(STANDARD_LIMITS)) {
    const limitKey = key as LimitKey;
    const current = countsMap[limitKey] || 0;

    // Check specific business override first
    const override = overrides.find((o) => o.limitKey === limitKey);
    let limitValue = override && typeof override.limitValue === 'number' ? override.limitValue : -1;

    if (!override) {
      const planLimit = plan.limits.find((l: { limitKey: string; limitValue: number }) => l.limitKey === limitKey);
      limitValue = planLimit ? planLimit.limitValue : -1;
    }

    const isUnlimited = limitValue === -1;
    const remaining = isUnlimited ? null : Math.max(0, limitValue - current);
    const isBlocked = !isUnlimited && current >= limitValue;

    metrics.push({
      limitKey,
      label,
      current,
      limit: limitValue,
      remaining,
      isUnlimited,
      isBlocked,
    });
  }

  return {
    businessId,
    planName: plan.name,
    metrics,
  };
}

/**
 * Checks a specific limit for a business before performing a creation operation.
 */
export async function checkLimit(businessId: string, limitKey: LimitKey): Promise<UsageMetric> {
  const usage = await getBusinessUsage(businessId);
  const metric = usage.metrics.find((m) => m.limitKey === limitKey);

  if (!metric) {
    return {
      limitKey,
      label: limitKey,
      current: 0,
      limit: -1,
      remaining: null,
      isUnlimited: true,
      isBlocked: false,
    };
  }

  return metric;
}

/**
 * Server-authoritative guard: Throws a domain error if the quota limit is reached.
 */
export async function enforceLimit(businessId: string, limitKey: LimitKey): Promise<void> {
  const check = await checkLimit(businessId, limitKey);
  if (check.isBlocked) {
    throw new Error(
      `Plan Limit Reached: Your store has reached the limit for ${check.label} (${check.current}/${check.limit}).`
    );
  }
}
