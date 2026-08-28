'use client';

import {
  CameraDetailView,
  type CameraDetailItem,
  type CameraStreamData,
  type HealthHistoryEntry,
} from '@/components/cctv/camera-detail-view';

export type CameraDetailPageData = {
  camera: CameraDetailItem;
  streamInfo: CameraStreamData;
  healthHistory: HealthHistoryEntry[];
};

export function CameraDetailClient({
  businessId,
  data,
  isOwner,
}: {
  businessId: string;
  data: CameraDetailPageData;
  isOwner: boolean;
}) {
  return (
    <div className="py-2">
      <CameraDetailView
        businessId={businessId}
        camera={data.camera}
        streamInfo={data.streamInfo}
        healthHistory={data.healthHistory}
        isOwner={isOwner}
      />
    </div>
  );
}
