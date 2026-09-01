import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { CameraStatus } from '@/generated/prisma/client';
import { CameraProvider } from './types';
import { RtspCameraProvider } from './providers/rtsp.provider';
import { OnvifCameraProvider } from './providers/onvif.provider';
import { CloudCameraProvider } from './providers/cloud.provider';
import { MockCameraProvider } from './providers/mock.provider';
import { sendNotification } from '../notifications';
import { loadCameraCredentials, encryptSecret, isCameraEncryptionConfigured } from '@/lib/security/encryption';

const providers: Record<string, CameraProvider> = {
  RTSP: new RtspCameraProvider(),
  ONVIF: new OnvifCameraProvider(),
  CLOUD: new CloudCameraProvider(),
  MOCK: new MockCameraProvider(),
};

export function getProviderForProtocol(protocol: string): CameraProvider {
  const norm = protocol.toUpperCase();
  return providers[norm] || providers.RTSP;
}

/** Map a provider error string to a coarse, actionable category. */
export function classifyError(error: string | undefined): string {
  if (!error) return 'NONE';
  const normalized = error.toLowerCase();
  if (normalized.includes('timeout') || normalized.includes('timed out')) return 'TIMEOUT';
  if (
    normalized.includes('unauthorized') ||
    normalized.includes('401') ||
    normalized.includes('403') ||
    normalized.includes('forbidden') ||
    normalized.includes('authentication') ||
    normalized.includes('credential')
  ) {
    return 'AUTHENTICATION_ERROR';
  }
  if (
    normalized.includes('dns') ||
    normalized.includes('enotfound') ||
    normalized.includes('eai_again') ||
    normalized.includes('name resolution')
  ) {
    return 'DNS_ERROR';
  }
  if (normalized.includes('unreachable') || normalized.includes('econnrefused') || normalized.includes('enetunreach')) {
    return 'CONNECTION_ERROR';
  }
  return 'CONNECTION_ERROR';
}

export async function checkCameraHealth(businessId: string, cameraId: string) {
  const camera = await prisma.camera.findFirst({
    where: { id: cameraId, businessId, isArchived: false },
  });

  if (!camera) {
    throw new Error('Camera not found');
  }

  if (!camera.isEnabled) {
    return {
      status: CameraStatus.DISABLED,
      message: 'Camera is currently disabled.',
      responseTimeMs: null,
    };
  }

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

  const provider = getProviderForProtocol(camera.protocol);
  const checkResult = await provider.testConnection(
    { host: camera.host, port: camera.port, path: camera.path },
    credentials ?? undefined
  );

  const previousStatus = camera.status;
  const newStatus = checkResult.status;

  // Classify the failure cause so operators can distinguish DNS/network
  // timeouts from authentication rejections and protocol errors.
  const errorCategory = classifyError(checkResult.error);

  // 1. Log Health Event
  await prisma.cameraHealthEvent.create({
    data: {
      cameraId: camera.id,
      businessId,
      status: newStatus,
      responseTimeMs: checkResult.responseTimeMs || null,
      errorCategory,
    },
  });

  // 2. Update Camera record
  const updatedCamera = await prisma.camera.update({
    where: { id: camera.id },
    data: {
      status: newStatus,
      lastCheckedAt: new Date(),
      ...(newStatus === CameraStatus.ONLINE ? { lastOnlineAt: new Date(), lastError: null } : {}),
      ...(checkResult.error ? { lastError: checkResult.error } : {}),
    },
  });

  // 3. Deduplicated Offline Alert Handling
  const dedupKey = `CAMERA_OFFLINE-${businessId}-${camera.id}`;

  if (newStatus === CameraStatus.OFFLINE || newStatus === CameraStatus.DEGRADED) {
    // Only dispatch notification if status changed or wasn't previously alerted
    await sendNotification({
      businessId,
      type: 'SYSTEM',
      severity: newStatus === CameraStatus.OFFLINE ? 'CRITICAL' : 'WARNING',
      title: `Security Camera Alert: ${camera.name} is ${newStatus}`,
      message: `The camera at location "${camera.location || 'Main'}" reported status ${newStatus}. ${checkResult.error || ''}`,
      isOwnerOnly: true,
      relatedEntity: 'CAMERA',
      relatedEntityId: camera.id,
      deduplicationKey: dedupKey,
      actionUrl: `/dashboard/cameras/${camera.id}`,
    });
  } else if (newStatus === CameraStatus.ONLINE && previousStatus === CameraStatus.OFFLINE) {
    // 4. Recovery Notification
    await sendNotification({
      businessId,
      type: 'SYSTEM',
      severity: 'SUCCESS',
      title: `Security Camera Restored: ${camera.name}`,
      message: `The camera at location "${camera.location || 'Main'}" is now back ONLINE.`,
      isOwnerOnly: true,
      relatedEntity: 'CAMERA',
      relatedEntityId: camera.id,
      deduplicationKey: `CAMERA_RECOVERED-${businessId}-${camera.id}-${Date.now()}`,
      actionUrl: `/dashboard/cameras/${camera.id}`,
    });
  }

  return {
    camera: {
      id: updatedCamera.id,
      name: updatedCamera.name,
      status: updatedCamera.status,
      lastCheckedAt: updatedCamera.lastCheckedAt,
      lastOnlineAt: updatedCamera.lastOnlineAt,
      lastError: updatedCamera.lastError,
    },
    responseTimeMs: checkResult.responseTimeMs,
    error: checkResult.error,
  };
}
