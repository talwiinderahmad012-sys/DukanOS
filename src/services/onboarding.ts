import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { MembershipRole, BusinessType } from '@/generated/prisma/client';

export type OnboardingData = {
  businessName: string;
  businessType: BusinessType;
  currency: string;
  timezone: string;
  branchName: string;
  city?: string;
};

export async function createBusinessForUser(userId: string, data: OnboardingData) {
  return prisma.$transaction(async (tx) => {
    // 1. Create Business
    const business = await tx.business.create({
      data: {
        name: data.businessName,
        type: data.businessType,
        currency: data.currency,
        timezone: data.timezone,
      }
    });

    // 2. Create Default Branch
    await tx.branch.create({
      data: {
        businessId: business.id,
        name: data.branchName || 'Main Branch',
        code: 'MAIN',
        city: data.city,
      }
    });

    // 3. Create Owner Membership
    await tx.businessMembership.create({
      data: {
        userId: userId,
        businessId: business.id,
        role: MembershipRole.OWNER,
      }
    });

    return business;
  });
}
