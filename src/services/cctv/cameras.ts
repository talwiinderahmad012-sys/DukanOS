import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { CameraStatus, CameraType } from '@/generated/prisma/client';
import { SanitizedCamera, CameraStreamInfo } from './types';
import { getProviderForProtocol, checkCameraHealth } from './health';
import { recordAuditLog } from '../audit';

function sanitizeCamera(raw: any): SanitizedCamera {
  return {
    id: raw.id,
    businessId: raw.businessId,
    branchId: raw.branchId,
    branchName: raw.branch?.name || undefined,
    name: raw.name,
    code: raw.code,
    location: raw.location,
    type: raw.type,
    status: raw.status,
    isEnabled: raw.isEnabled,
    isArchived: raw.isArchived,
    protocol: raw.protocol,
    host: raw.host,
    port: raw.port,
    path: raw.path,
    hlsStreamUrl: raw.hlsStreamUrl,
    hasCredentials: !!raw.encryptedSecrets,
    lastCheckedAt: raw.lastCheckedAt,
    lastOnlineAt: raw.lastOnlineAt,
    lastError: raw.lastError,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function listCameras(businessId: string, branchId?: string) {
  const cameras = await prisma.camera.findMany({
    where: {
      businessId,
      isArchived: false,
      ...(branchId ? { branchId } : {}),
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ branchId: 'asc' }, { createdAt: 'asc' }],
  });

  return cameras.map(sanitizeCamera);
}

export async function getCameraById(businessId: string, cameraId: string): Promise<{
  camera: SanitizedCamera;
  streamInfo: CameraStreamInfo;
  healthHistory: any[];
} | null> {
  const camera = await prisma.camera.findFirst({
    where: { id: cameraId, businessId, isArchived: false },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      healthEvents: {
        orderBy: { checkedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!camera) return null;

  const sanitized = sanitizeCamera(camera);
  const provider = getProviderForProtocol(camera.protocol);

  let secrets: any = null;
  if (camera.encryptedSecrets) {
    try {
      secrets = JSON.parse(camera.encryptedSecrets);
    } catch {
      // ignore
    }
  }

  const streamInfo = await provider.getStreamInfo(sanitized, secrets);

  return {
    camera: sanitized,
    streamInfo,
    healthHistory: camera.healthEvents,
  };
}

export async function createCamera(
  businessId: string,
  userId: string,
  data: {
    name: string;
    code?: string;
    location?: string;
    branchId?: string;
    type?: CameraType;
    protocol?: string;
    host?: string;
    port?: number;
    path?: string;
    hlsStreamUrl?: string;
    username?: string;
    password?: string;
  }
) {
  const secrets =
    data.username || data.password
      ? JSON.stringify({ username: data.username, password: data.password })
      : null;

  const camera = await prisma.camera.create({
    data: {
      businessId,
      branchId: data.branchId || null,
      name: data.name,
      code: data.code || null,
      location: data.location || null,
      type: data.type || CameraType.IP_CAMERA,
      protocol: (data.protocol || 'RTSP').toUpperCase(),
      host: data.host || null,
      port: data.port || 554,
      path: data.path || null,
      hlsStreamUrl: data.hlsStreamUrl || null,
      encryptedSecrets: secrets,
      status: CameraStatus.UNKNOWN,
      isEnabled: true,
      isArchived: false,
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'CAMERA_REGISTERED',
    entityType: 'Camera',
    entityId: camera.id,
    metadata: { name: camera.name, location: camera.location, type: camera.type },
  });

  // Run initial health check asynchronously
  try {
    await checkCameraHealth(businessId, camera.id);
  } catch {
    // Non-blocking
  }

  return sanitizeCamera(camera);
}

export async function updateCamera(
  businessId: string,
  userId: string,
  cameraId: string,
  data: {
    name?: string;
    code?: string;
    location?: string;
    branchId?: string | null;
    type?: CameraType;
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
  const existing = await prisma.camera.findFirst({
    where: { id: cameraId, businessId },
  });

  if (!existing) {
    throw new Error('Camera not found');
  }

  let updatedSecrets = existing.encryptedSecrets;
  if (data.username !== undefined || data.password !== undefined) {
    let currentParsed: any = {};
    if (existing.encryptedSecrets) {
      try {
        currentParsed = JSON.parse(existing.encryptedSecrets);
      } catch {
        // ignore
      }
    }
    updatedSecrets = JSON.stringify({
      username: data.username !== undefined ? data.username : currentParsed.username,
      password: data.password !== undefined ? data.password : currentParsed.password,
    });
  }

  const updated = await prisma.camera.update({
    where: { id: cameraId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.protocol !== undefined && { protocol: data.protocol.toUpperCase() }),
      ...(data.host !== undefined && { host: data.host }),
      ...(data.port !== undefined && { port: data.port }),
      ...(data.path !== undefined && { path: data.path }),
      ...(data.hlsStreamUrl !== undefined && { hlsStreamUrl: data.hlsStreamUrl }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      encryptedSecrets: updatedSecrets,
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'CAMERA_UPDATED',
    entityType: 'Camera',
    entityId: cameraId,
    metadata: { name: updated.name, location: updated.location },
  });

  return sanitizeCamera(updated);
}

export async function archiveCamera(
  businessId: string,
  userId: string,
  cameraId: string
) {
  const updated = await prisma.camera.update({
    where: { id: cameraId, businessId },
    data: {
      isArchived: true,
      isEnabled: false,
      status: CameraStatus.DISABLED,
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'CAMERA_ARCHIVED',
    entityType: 'Camera',
    entityId: cameraId,
    metadata: { name: updated.name },
  });

  return { archived: true };
}

export async function testCameraConnection(
  protocol: string,
  host?: string,
  port?: number,
  path?: string,
  username?: string,
  password?: string
) {
  const provider = getProviderForProtocol(protocol || 'RTSP');
  return provider.testConnection(
    { host, port, path },
    username || password ? { username, password } : undefined
  );
}
