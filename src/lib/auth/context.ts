import 'server-only';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { MembershipRole } from '@/generated/prisma/client';
import { AppError, ErrorCodes } from '@/lib/errors';

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new AppError(ErrorCodes.UNAUTHENTICATED, 'Authentication required', 401);
  }
  return { ...user, id: user.id };
}

export async function getBusinessMembership(userId: string, businessId: string) {
  return prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId,
        businessId,
      },
    },
    include: {
      business: true,
    }
  });
}

export async function requireBusinessAccess(businessId: string, allowedRoles?: MembershipRole[]) {
  const user = await requireAuthenticatedUser();
  const membership = await getBusinessMembership(user.id, businessId);

  if (!membership) {
    throw new AppError(ErrorCodes.BUSINESS_ACCESS_DENIED, 'Business access denied', 403);
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Insufficient permissions for this action', 403);
  }

  return {
    user,
    membership,
    business: membership.business,
    role: membership.role,
  };
}
