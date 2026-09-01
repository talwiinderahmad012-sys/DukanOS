import { requireActiveBusiness } from '@/lib/auth/guards';
import { getCameraById } from '@/services/cctv/cameras';
import { notFound, redirect } from 'next/navigation';
import { CameraDetailClient, type CameraDetailPageData } from './camera-detail-client';

export default async function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { business, membership } = await requireActiveBusiness();

  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
    redirect('/dashboard/cameras');
  }

  const details = await getCameraById(business.id, id);
  if (!details) {
    notFound();
  }

  const data: CameraDetailPageData = {
    camera: {
      id: details.camera.id,
      name: details.camera.name,
      location: details.camera.location,
      type: details.camera.type,
      status: details.camera.status,
      isEnabled: details.camera.isEnabled,
      protocol: details.camera.protocol,
      host: details.camera.host,
      port: details.camera.port,
      path: details.camera.path,
      lastError: details.camera.lastError,
      lastCheckedAt: details.camera.lastCheckedAt ? details.camera.lastCheckedAt.toISOString() : null,
      lastOnlineAt: details.camera.lastOnlineAt ? details.camera.lastOnlineAt.toISOString() : null,
    },
    streamInfo: {
      streamAvailable: details.streamInfo.streamAvailable,
      streamUrl: details.streamInfo.streamUrl,
      message: details.streamInfo.message,
    },
    healthHistory: details.healthHistory.map((h: any) => ({
      id: h.id,
      status: h.status,
      responseTimeMs: h.responseTimeMs ?? null,
      checkedAt: h.checkedAt instanceof Date ? h.checkedAt.toISOString() : String(h.checkedAt),
    })),
  };

  return (
    <CameraDetailClient
      businessId={business.id}
      data={data}
      isOwner={membership.role === 'OWNER'}
    />
  );
}
