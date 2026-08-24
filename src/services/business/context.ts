import { prisma } from '@/lib/db/prisma';
import { BusinessStatus, BusinessType, MembershipRole, SubscriptionStatus } from '@/generated/prisma/client';
import { recordAuditLog } from '../audit';
import { ensureDefaultFreePlan } from '../billing/plans';

export async function listUserBusinesses(userId: string) {
  const memberships = await prisma.businessMembership.findMany({
    where: { userId },
    include: {
      business: {
        include: {
          branches: {
            where: { status: 'ACTIVE' },
          },
          BusinessSetting: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    joinedAt: m.createdAt,
    business: {
      id: m.business.id,
      name: m.business.name,
      type: m.business.type,
      status: m.business.status,
      currency: m.business.currency,
      currencySymbol: m.business.BusinessSetting?.currencySymbol || 'Rs.',
      timezone: m.business.timezone,
      phone: m.business.phone,
      address: m.business.address,
      city: m.business.city,
      branchesCount: m.business.branches.length,
      createdAt: m.business.createdAt,
    },
  }));
}

export async function createBusinessForUser(
  userId: string,
  data: {
    name: string;
    type?: BusinessType;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    branchName?: string;
    branchCode?: string;
  }
) {
  if (!data.name || !data.name.trim()) {
    throw new Error('Business name is required.');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Create Business
    const business = await tx.business.create({
      data: {
        name: data.name.trim(),
        type: data.type || BusinessType.RETAIL,
        status: BusinessStatus.ACTIVE,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        timezone: 'Asia/Karachi',
        currency: 'PKR',
      },
    });

    // 2. Create Default Initial Branch
    const branch = await tx.branch.create({
      data: {
        businessId: business.id,
        name: data.branchName?.trim() || 'Main Branch',
        code: data.branchCode?.trim().toUpperCase() || 'MAIN',
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        city: data.city?.trim() || null,
      },
    });

    // 3. Create Business Owner Membership
    const membership = await tx.businessMembership.create({
      data: {
        businessId: business.id,
        userId,
        role: MembershipRole.OWNER,
      },
    });

    // 4. Initialize Business Settings
    const settings = await tx.businessSetting.create({
      data: {
        businessId: business.id,
        currencySymbol: 'Rs.',
        currencyPosition: 'BEFORE',
        invoicePrefix: 'INV-',
        invoiceStartingNumber: 1001,
        allowNegativeStock: false,
        requireCustomerForCredit: true,
        maxCashierDiscountPercent: 5.0,
        maxManagerDiscountPercent: 15.0,
        receiptFooter: 'Thank you for shopping with us! Please visit again.',
        showFeedbackQr: true,
        slowMovingDays: 30,
        lowStockThresholdDefault: 5,
        salesDeclineThresholdPercent: 15.0,
        profitDeclineThresholdPercent: 15.0,
        expenseSpikeThresholdPercent: 20.0,
        creditRiskThresholdPercent: 25.0,
      },
    });

    // 5. Assign Default Free Plan Subscription Atomically
    const freePlan = await ensureDefaultFreePlan();
    const subscription = await tx.businessSubscription.create({
      data: {
        businessId: business.id,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // 6. Audit Log
    await tx.auditLog.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        userId,
        action: 'BUSINESS_CREATED',
        entityType: 'Business',
        entityId: business.id,
        metadata: JSON.stringify({ name: business.name, type: business.type, plan: freePlan.code }),
      },
    });

    return {
      business,
      branch,
      membership,
      settings,
      subscription,
    };
  });
}

export async function archiveBusiness(businessId: string, actorUserId: string) {
  // 1. Verify actor is OWNER
  const membership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: actorUserId,
        businessId,
      },
    },
    include: { business: true },
  });

  if (!membership || membership.role !== MembershipRole.OWNER) {
    throw new Error('Only a business owner can archive or deactivate a business.');
  }

  const newStatus =
    membership.business.status === BusinessStatus.ARCHIVED
      ? BusinessStatus.ACTIVE
      : BusinessStatus.ARCHIVED;

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: { status: newStatus },
  });

  await recordAuditLog({
    businessId,
    userId: actorUserId,
    action: newStatus === BusinessStatus.ARCHIVED ? 'BUSINESS_ARCHIVED' : 'BUSINESS_RESTORED',
    entityType: 'Business',
    entityId: businessId,
    metadata: { previousStatus: membership.business.status, newStatus },
  });

  return updated;
}

export async function transferBusinessOwnership(
  businessId: string,
  currentOwnerUserId: string,
  targetUserId: string,
  newRoleForOldOwner: MembershipRole = MembershipRole.MANAGER
) {
  if (currentOwnerUserId === targetUserId) {
    throw new Error('You are already the owner of this business.');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Verify current owner
    const currentOwner = await tx.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: currentOwnerUserId,
          businessId,
        },
      },
    });

    if (!currentOwner || currentOwner.role !== MembershipRole.OWNER) {
      throw new Error('Only the current business owner can initiate ownership transfer.');
    }

    // 2. Verify target member exists in business
    const targetMember = await tx.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: targetUserId,
          businessId,
        },
      },
      include: { user: true },
    });

    if (!targetMember) {
      throw new Error('Target user is not a member of this business.');
    }

    // 3. Promote target to OWNER
    await tx.businessMembership.update({
      where: { id: targetMember.id },
      data: { role: MembershipRole.OWNER },
    });

    // 4. Update previous owner to new role
    await tx.businessMembership.update({
      where: { id: currentOwner.id },
      data: { role: newRoleForOldOwner },
    });

    // 5. Record Audit Log
    await tx.auditLog.create({
      data: {
        businessId,
        userId: currentOwnerUserId,
        action: 'BUSINESS_OWNERSHIP_TRANSFERRED',
        entityType: 'Business',
        entityId: businessId,
        metadata: JSON.stringify({
          previousOwnerId: currentOwnerUserId,
          newOwnerId: targetUserId,
          newOwnerEmail: targetMember.user.email,
          oldOwnerNewRole: newRoleForOldOwner,
        }),
      },
    });

    return { success: true, newOwnerId: targetUserId };
  });
}
