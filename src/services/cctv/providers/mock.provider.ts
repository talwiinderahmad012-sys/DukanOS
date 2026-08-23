import { CameraProvider, CameraStatus, CameraStreamInfo, SanitizedCamera } from '../types';

export class MockCameraProvider implements CameraProvider {
  protocol = 'MOCK';

  async testConnection(
    config: { host?: string | null; port?: number | null },
    secrets?: { username?: string; password?: string }
  ): Promise<{
    success: boolean;
    status: CameraStatus;
    responseTimeMs?: number;
    error?: string;
  }> {
    if (config.host === 'offline-host') {
      return {
        success: false,
        status: 'OFFLINE',
        error: 'Host unreachable (simulated)',
      };
    }

    if (config.host === 'degraded-host') {
      return {
        success: true,
        status: 'DEGRADED',
        responseTimeMs: 850,
        error: 'High latency detected',
      };
    }

    return {
      success: true,
      status: 'ONLINE',
      responseTimeMs: 20,
    };
  }

  async getStreamInfo(camera: SanitizedCamera): Promise<CameraStreamInfo> {
    if (camera.hlsStreamUrl) {
      return {
        streamAvailable: true,
        streamType: 'HLS',
        streamUrl: camera.hlsStreamUrl,
        message: 'Mock stream available.',
      };
    }

    return {
      streamAvailable: false,
      streamType: 'GATEWAY_REQUIRED',
      message: 'Media gateway required for browser playback.',
    };
  }
}
