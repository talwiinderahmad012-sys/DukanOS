'use client';

import { CameraForm } from '@/components/cctv/camera-form';

export type CameraNewBranchOption = { id: string; name: string; code: string };

export function CameraNewClient({
  businessId,
  branches,
}: {
  businessId: string;
  branches: CameraNewBranchOption[];
}) {
  return (
    <div className="py-2">
      <CameraForm businessId={businessId} branches={branches} />
    </div>
  );
}
