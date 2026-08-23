import { CameraProvider, CameraStatus, CameraStreamInfo, SanitizedCamera } from '../types';

export class CloudCameraProvider implements CameraProvider {
  protocol = 'CLOUD';

  async testConnection(
    config: { host?: string | null; port?: number | null; path?: string | null },
    secrets?: { username?: string; password?: string }
  ): Promise<{
    success: boolean;
    status: CameraStatus;
    responseTimeMs?: number;
    error?: string;
  }> {
    return {
      success: true,
      status: 'ONLINE',
      responseTimeMs: 25,
    };
  }

  async getStreamInfo(
    camera: SanitizedCamera,
    secrets?: { username?: string; password?: string }
  ): Promise<CameraStreamInfo> {
    if (camera.hlsStreamUrl && camera.hlsStreamUrl.trim() !== '') {
      return {
        streamAvailable: true,
        streamType: 'HLS',
        streamUrl: camera.hlsStreamUrl,
        message: 'Cloud camera stream ready for playback.',
      };
    }

    return {
      streamAvailable: false,
      streamType: 'GATEWAY_REQUIRED',
      message: 'Cloud stream endpoint URL is required to play this stream in browser.',
    };
  }
}
