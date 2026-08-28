import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listCameras } from '@/services/cctv/cameras';
import { redirect } from 'next/navigation';
import { CamerasPageClient, type CameraPageItem } from './cameras-page-client';

export default async function CamerasPage() {
  const { business, membership } = await getActiveBusiness().catch(() =>
    redirect('/onboarding')
  );

  // Strictly enforce role-based access: OWNER and MANAGER only
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const isOwner = membership.role === 'OWNER';
  const cameras = await listCameras(business.id);

  const items: CameraPageItem[] = cameras.map((camera) => ({
    id: camera.id,
    name: camera.name,
    location: camera.location,
    branchName: camera.branchName,
    type: camera.type,
    status: camera.status,
    isEnabled: camera.isEnabled,
    protocol: camera.protocol,
    host: camera.host,
    port: camera.port,
    lastError: camera.lastError,
    lastCheckedAt: camera.lastCheckedAt ? camera.lastCheckedAt.toISOString() : null,
    lastOnlineAt: camera.lastOnlineAt ? camera.lastOnlineAt.toISOString() : null,
  }));

  return (
    <CamerasPageClient businessId={business.id} initialCameras={items} isOwner={isOwner} />
  );
}
