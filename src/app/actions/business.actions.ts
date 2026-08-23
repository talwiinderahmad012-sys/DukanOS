'use server';

import { cookies } from 'next/headers';
import { requireAuthenticatedUser, requireBusinessAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { MembershipRole, BusinessType } from '@/generated/prisma/client';
import {
  listUserBusinesses,
  createBusinessForUser,
  archiveBusiness,
  transferBusinessOwnership,
} from '@/services/business/context';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

export async function switchActiveBusinessAction(businessId: string) {
  try {
    const user = await requireAuthenticatedUser();

    // Verify user has membership in the requested business
    const membership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId,
        },
      },
      include: {
        business: {
          include: {
            branches: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!membership) {
      return createError(AppErrors.BUSINESS_ACCESS_DENIED, 'You do not have access to this business.');
    }

    const cookieStore = await cookies();
    cookieStore.set('dukaanos_active_business_id', businessId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Reset branch cookie to default first branch or all
    const defaultBranchId = membership.business.branches.length > 0 ? membership.business.branches[0].id : 'all';
    cookieStore.set('dukaanos_active_branch_id', defaultBranchId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return createSuccess({ businessId, branchId: defaultBranchId });
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to switch business');
  }
}

export async function switchActiveBranchAction(branchId: string) {
  try {
    const user = await requireAuthenticatedUser();
    const cookieStore = await cookies();
    const activeBusinessId = cookieStore.get('dukaanos_active_business_id')?.value;

    if (!activeBusinessId) {
      return createError(AppErrors.BUSINESS_ACCESS_DENIED, 'No active business selected.');
    }

    if (branchId !== 'all') {
      // Validate branch belongs to current business
      const branch = await prisma.branch.findUnique({
        where: { id: branchId, businessId: activeBusinessId },
      });

      if (!branch) {
        return createError(AppErrors.BUSINESS_ACCESS_DENIED, 'Branch not found in active business.');
      }
    }

    cookieStore.set('dukaanos_active_branch_id', branchId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return createSuccess({ branchId });
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to switch branch');
  }
}

export async function createBusinessAction(payload: {
  name: string;
  type?: BusinessType;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  branchName?: string;
  branchCode?: string;
}) {
  try {
    const user = await requireAuthenticatedUser();
    const result = await createBusinessForUser(user.id, payload);

    const cookieStore = await cookies();
    cookieStore.set('dukaanos_active_business_id', result.business.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    cookieStore.set('dukaanos_active_branch_id', result.branch.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create business');
  }
}

export async function archiveBusinessAction(businessId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);
    const updated = await archiveBusiness(businessId, user.id);
    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to archive business');
  }
}

export async function transferOwnershipAction(payload: {
  businessId: string;
  targetUserId: string;
  newRoleForOldOwner?: MembershipRole;
}) {
  try {
    const { user } = await requireBusinessAccess(payload.businessId, [MembershipRole.OWNER]);
    const result = await transferBusinessOwnership(
      payload.businessId,
      user.id,
      payload.targetUserId,
      payload.newRoleForOldOwner || MembershipRole.MANAGER
    );
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to transfer ownership');
  }
}

export async function listUserBusinessesAction() {
  try {
    const user = await requireAuthenticatedUser();
    const businesses = await listUserBusinesses(user.id);
    return createSuccess(businesses);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list businesses');
  }
}
