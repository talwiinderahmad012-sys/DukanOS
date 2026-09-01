import { CameraProvider, CameraStatus, CameraStreamInfo, SanitizedCamera } from '../types';
import { isSimulatedTarget, simulateConnection } from './simulation';

const PROBE_TIMEOUT_MS = 5000;

const GET_SYSTEM_DATE_AND_TIME = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <s:Body>
    <tds:GetSystemDateAndTime/>
  </s:Body>
</s:Envelope>`;

/**
 * Perform a real ONVIF reachability check by sending an unauthenticated
 * GetSystemDateAndTime SOAP request to the device service endpoint. Per the
 * ONVIF core spec this operation must be available without credentials, so a
 * 200 with a SOAP envelope proves the device is a reachable ONVIF service.
 */
async function probeOnvif(
  host: string,
  port: number
): Promise<{ success: boolean; status: CameraStatus; responseTimeMs: number; error?: string }> {
  const startedAt = Date.now();
  const url = `http://${host}:${port}/onvif/device_service`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body: GET_SYSTEM_DATE_AND_TIME,
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);

    const responseTimeMs = Date.now() - startedAt;

    if (response.ok) {
      return { success: true, status: 'ONLINE', responseTimeMs };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        success: true,
        status: 'DEGRADED',
        responseTimeMs,
        error: `ONVIF device rejected unauthenticated discovery (${response.status}). Check the stored camera credentials.`,
      };
    }

    return {
      success: true,
      status: 'DEGRADED',
      responseTimeMs,
      error: `ONVIF device service responded with HTTP ${response.status}.`,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      success: false,
      status: 'OFFLINE',
      responseTimeMs: Date.now() - startedAt,
      error: aborted
        ? `ONVIF device service did not respond on ${host}:${port} within ${PROBE_TIMEOUT_MS}ms.`
        : `ONVIF device service did not respond on ${host}:${port}.`,
    };
  }
}

export class OnvifCameraProvider implements CameraProvider {
  protocol = 'ONVIF';

  async testConnection(
    config: { host?: string | null; port?: number | null; path?: string | null },
    secrets?: { username?: string; password?: string }
  ): Promise<{
    success: boolean;
    status: CameraStatus;
    responseTimeMs?: number;
    error?: string;
  }> {
    const { host, port = 80 } = config;

    if (!host || host.trim() === '') {
      return {
        success: false,
        status: 'OFFLINE',
        error: 'Host IP address is required for ONVIF device discovery.',
      };
    }

    void secrets;

    if (isSimulatedTarget(host)) {
      return simulateConnection(host);
    }

    return probeOnvif(host.trim(), port || 80);
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
        message: 'Live stream available via ONVIF media gateway profile.',
      };
    }

    return {
      streamAvailable: false,
      streamType: 'GATEWAY_REQUIRED',
      message:
        'ONVIF device profile discovered. Direct browser playback requires a media gateway to transcode RTSP stream profiles into HLS/WebRTC.',
    };
  }
}
