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

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const activeBusinessId = cookieStore.get('dukaanos_active_business_id')?.value;

  let activeMembership = memberships[0];
  if (activeBusinessId) {
    const found = memberships.find(m => m.businessId === activeBusinessId);
    if (found) activeMembership = found;
  }

  return {
    user,
    membership: activeMembership,
    business: activeMembership.business
  };
}
