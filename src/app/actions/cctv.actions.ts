'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  listCameras,
  getCameraById,
  createCamera,
  updateCamera,
  archiveCamera,
  testCameraConnection,
} from '@/services/cctv/cameras';
import { checkCameraHealth } from '@/services/cctv/health';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

export async function listCamerasAction(businessId: string, branchId?: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const cameras = await listCameras(businessId, branchId);
    return createSuccess(cameras);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list cameras');
  }
}

export async function getCameraDetailsAction(businessId: string, cameraId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const details = await getCameraById(businessId, cameraId);
    if (!details) {
      return createError(AppErrors.NOT_FOUND, 'Camera not found');
    }

    return createSuccess(details);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to get camera details');
  }
}

export async function createCameraAction(
  businessId: string,
  payload: {
    name: string;
    code?: string;
    location?: string;
    branchId?: string;
    type?: any;
    protocol?: string;
    host?: string;
    port?: number;
    path?: string;
    hlsStreamUrl?: string;
    username?: string;
    password?: string;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    if (!payload.name || payload.name.trim() === '') {
      return createError(AppErrors.VALIDATION_ERROR, 'Camera name is required');
    }

    const camera = await createCamera(businessId, user.id, payload);
    return createSuccess(camera);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create camera');
  }
}

export async function updateCameraAction(
  businessId: string,
  cameraId: string,
  payload: {
    name?: string;
    code?: string;
    location?: string;
    branchId?: string | null;
    type?: any;
    protocol?: string;
    host?: string;
    port?: number;
    path?: string;
    hlsStreamUrl?: string;
    isEnabled?: boolean;
    username?: string;
    password?: string;
  }
) {
  try {
    const { user } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const updated = await updateCamera(businessId, user.id, cameraId, payload);
    return createSuccess(updated);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to update camera');
  }
}

export async function archiveCameraAction(businessId: string, cameraId: string) {
  try {
    const { user } = await requireBusinessAccess(businessId, [MembershipRole.OWNER]);

    const res = await archiveCamera(businessId, user.id, cameraId);
    return createSuccess(res);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to archive camera');
  }
}

export async function testCameraConnectionAction(
  businessId: string,
  payload: {
    protocol: string;
    host?: string;
    port?: number;
    path?: string;
    username?: string;
    password?: string;
  }
) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const result = await testCameraConnection(
      payload.protocol,
      payload.host,
      payload.port,
      payload.path,
      payload.username,
      payload.password
    );

    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to test camera connection');
  }
}

export async function checkCameraHealthAction(businessId: string, cameraId: string) {
  try {
    await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const result = await checkCameraHealth(businessId, cameraId);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to check camera health');
  }
}
