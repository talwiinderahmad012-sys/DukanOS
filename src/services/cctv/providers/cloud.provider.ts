import { CameraProvider, CameraStatus, CameraStreamInfo, SanitizedCamera } from '../types';
import { isSimulatedTarget, simulateConnection } from './simulation';

const PROBE_TIMEOUT_MS = 5000;

/**
 * Cloud cameras expose an HTTPS stream/health endpoint. Probe the configured
 * stream URL (or the host itself when it is a URL) with a real HTTP request.
 */
async function probeCloud(
  target: string
): Promise<{ success: boolean; status: CameraStatus; responseTimeMs: number; error?: string }> {
  const startedAt = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(target, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);

    const responseTimeMs = Date.now() - startedAt;

    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return { success: true, status: 'ONLINE', responseTimeMs };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        success: true,
        status: 'DEGRADED',
        responseTimeMs,
        error: `Cloud camera endpoint rejected the request (${response.status}). Check credentials or signed URL.`,
      };
    }

    return {
      success: true,
      status: 'DEGRADED',
      responseTimeMs,
      error: `Cloud camera endpoint responded with HTTP ${response.status}.`,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      success: false,
      status: 'OFFLINE',
      responseTimeMs: Date.now() - startedAt,
      error: aborted
        ? `Cloud camera endpoint did not respond within ${PROBE_TIMEOUT_MS}ms.`
        : 'Cloud camera endpoint is unreachable.',
    };
  }
}

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
    void secrets;
    const host = config.host || '';

    if (!host || host.trim() === '') {
      return {
        success: false,
        status: 'OFFLINE',
        error: 'Cloud camera stream endpoint is required.',
      };
    }

    // Deterministic simulation for placeholder hosts; real HTTPS probe for
    // fully-qualified stream URLs.
    const isUrl = /^https?:\/\//i.test(host.trim());
    if (!isUrl || isSimulatedTarget(host)) {
      return simulateConnection(host);
    }

    return probeCloud(host.trim());
  }

  async getStreamInfo(
    camera: SanitizedCamera,
    secrets?: { username?: string; password?: string }
  ): Promise<CameraStreamInfo> {
    void secrets;

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
