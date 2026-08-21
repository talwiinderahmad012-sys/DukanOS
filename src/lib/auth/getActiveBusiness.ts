import 'server-only';
import { requireAuthenticatedUser } from './context';
import { prisma } from '@/lib/db/prisma';

export async function getActiveBusiness() {
  const user = await requireAuthenticatedUser();
  const memberships = await prisma.businessMembership.findMany({
    where: { userId: user.id },
    include: { business: true }
  });

  if (memberships.length === 0) {
    throw new Error('NO_BUSINESS');
  }

  return {
    user,
    membership: memberships[0],
    business: memberships[0].business
  };
}
