import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listCameras } from '@/services/cctv/cameras';
import { CameraListView } from '@/components/cctv/camera-list-view';
import { redirect } from 'next/navigation';

export default async function CamerasPage() {
  const { user, business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  // Strictly enforce role-based access: OWNER and MANAGER only
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const isOwner = membership.role === 'OWNER';
  const cameras = await listCameras(business.id);

  return (
    <div className="max-w-6xl mx-auto">
      <CameraListView
        businessId={business.id}
        initialCameras={cameras}
        isOwner={isOwner}
      />
    </div>
  );
}
