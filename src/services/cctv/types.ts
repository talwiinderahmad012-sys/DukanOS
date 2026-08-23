export type CameraType =
  | 'IP_CAMERA'
  | 'NVR'
  | 'DVR'
  | 'ONVIF'
  | 'RTSP'
  | 'CLOUD_CAMERA'
  | 'OTHER';

export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN' | 'DISABLED';

export interface CameraStreamInfo {
  streamAvailable: boolean;
  streamType: 'HLS' | 'WEBRTC' | 'GATEWAY_REQUIRED';
  streamUrl?: string;
  message: string;
}

export interface SanitizedCamera {
  id: string;
  businessId: string;
  branchId: string | null;
  branchName?: string;
  name: string;
  code: string | null;
  location: string | null;
  type: CameraType;
  status: CameraStatus;
  isEnabled: boolean;
  isArchived: boolean;
  protocol: string;
  host: string | null;
  port: number | null;
  path: string | null;
  hlsStreamUrl: string | null;
  hasCredentials: boolean;
  lastCheckedAt: Date | null;
  lastOnlineAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CameraProvider {
  protocol: string;
  testConnection(
    config: { host?: string | null; port?: number | null; path?: string | null },
    secrets?: { username?: string; password?: string }
  ): Promise<{
    success: boolean;
    status: CameraStatus;
    responseTimeMs?: number;
    error?: string;
  }>;
  getStreamInfo(
    camera: SanitizedCamera,
    secrets?: { username?: string; password?: string }
  ): Promise<CameraStreamInfo>;
}
