import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { CameraNewClient } from './camera-new-client';

export default async function NewCameraPage() {
  const { business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
    redirect('/dashboard/cameras');
  }

  const branches = await prisma.branch.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  return <CameraNewClient businessId={business.id} branches={branches} />;
}
