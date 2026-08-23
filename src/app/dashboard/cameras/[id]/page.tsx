import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getCameraById } from '@/services/cctv/cameras';
import { CameraDetailView } from '@/components/cctv/camera-detail-view';
import { notFound, redirect } from 'next/navigation';

export default async function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
    redirect('/dashboard/cameras');
  }

  const details = await getCameraById(business.id, id);
  if (!details) {
    notFound();
  }

  return (
    <div className="py-2">
      <CameraDetailView
        businessId={business.id}
        camera={details.camera}
        streamInfo={details.streamInfo}
        healthHistory={details.healthHistory}
        isOwner={membership.role === 'OWNER'}
      />
    </div>
  );
}
