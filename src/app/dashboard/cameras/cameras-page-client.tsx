'use client';

import { CameraListView, type CameraListItem } from '@/components/cctv/camera-list-view';

export type CameraPageItem = CameraListItem;

export function CamerasPageClient({
  businessId,
  initialCameras,
  isOwner,
}: {
  businessId: string;
  initialCameras: CameraPageItem[];
  isOwner: boolean;
}) {
  return (
    <div className="max-w-6xl mx-auto">
      <CameraListView businessId={businessId} initialCameras={initialCameras} isOwner={isOwner} />
    </div>
  );
}
