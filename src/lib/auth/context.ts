import 'server-only';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { MembershipRole } from '@/generated/prisma/client';
import { AppErrors } from '../utils/api-response';

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new Error(AppErrors.UNAUTHENTICATED);
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
    throw new Error(AppErrors.BUSINESS_ACCESS_DENIED);
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
    throw new Error(AppErrors.UNAUTHORIZED);
  }

  return {
    user,
    membership,
    business: membership.business,
    role: membership.role,
  };
}
