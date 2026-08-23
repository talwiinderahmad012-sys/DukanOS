import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { CameraForm } from '@/components/cctv/camera-form';
import { redirect } from 'next/navigation';

export default async function NewCameraPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
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

  return (
    <div className="py-2">
      <CameraForm businessId={business.id} branches={branches} />
    </div>
  );
}
