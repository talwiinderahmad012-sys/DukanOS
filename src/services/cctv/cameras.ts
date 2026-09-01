import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { CameraStatus, CameraType } from '@/generated/prisma/client';
import { SanitizedCamera, CameraStreamInfo } from './types';
import { getProviderForProtocol, checkCameraHealth } from './health';
import { recordAuditLog } from '../audit';
import {
  encryptSecret,
  isCameraEncryptionConfigured,
  loadCameraCredentials,
} from '@/lib/security/encryption';
import { AppError, ErrorCodes } from '@/lib/errors';

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

/**
 * Camera credentials must only ever be persisted as AES-256-GCM ciphertext.
 * Fail closed when credentials are supplied but no encryption key is
 * configured, rather than silently writing plaintext.
 */
function serializeCredentialsForStorage(username?: string, password?: string): string | null {
  if (!username && !password) return null;
  const ciphertext = encryptSecret(JSON.stringify({ username, password }));
  if (ciphertext === null) {
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      'Camera credential encryption is not configured. Set CCTV_SECRETS_ENCRYPTION_KEY before storing camera credentials.',
      503
    );
  }
  return ciphertext;
}

async function assertBranchBelongsToBusiness(businessId: string, branchId: string | null | undefined): Promise<void> {
  if (!branchId) return;
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId },
    select: { id: true },
  });
  if (!branch) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Branch does not belong to this business.', 400);
  }
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

  const { credentials, reencryptNeeded } = loadCameraCredentials(camera.encryptedSecrets);

  // Transparently upgrade legacy plaintext credentials to encrypted storage.
  if (reencryptNeeded && camera.encryptedSecrets && isCameraEncryptionConfigured()) {
    const upgraded = encryptSecret(camera.encryptedSecrets);
    if (upgraded) {
      prisma.camera
        .update({ where: { id: camera.id }, data: { encryptedSecrets: upgraded } })
        .catch(() => {
          /* non-blocking upgrade */
        });
    }
  }

  const streamInfo = await provider.getStreamInfo(sanitized, credentials ?? undefined);

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
  await assertBranchBelongsToBusiness(businessId, data.branchId);

  const secrets = serializeCredentialsForStorage(data.username, data.password);

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
  await assertBranchBelongsToBusiness(businessId, data.branchId);

  const existing = await prisma.camera.findFirst({
    where: { id: cameraId, businessId },
  });

  if (!existing) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Camera not found', 404);
  }

  // Merge any supplied credentials with the existing ones, always persisting
  // the result as ciphertext (legacy plaintext values are upgraded in place).
  let updatedSecrets = existing.encryptedSecrets;
  const { credentials: existingCredentials } = loadCameraCredentials(existing.encryptedSecrets);
  if (data.username !== undefined || data.password !== undefined) {
    const merged = {
      username: data.username !== undefined ? data.username : existingCredentials?.username,
      password: data.password !== undefined ? data.password : existingCredentials?.password,
    };
    updatedSecrets = serializeCredentialsForStorage(merged.username, merged.password);
  } else if (existing.encryptedSecrets && !existing.encryptedSecrets.startsWith('enc:v1:') && isCameraEncryptionConfigured()) {
    // No credential change requested, but opportunistically encrypt legacy
    // plaintext values whenever the key is available.
    const upgraded = encryptSecret(existing.encryptedSecrets);
    if (upgraded) updatedSecrets = upgraded;
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
