import * as net from 'net';
import { CameraProvider, CameraStatus, CameraStreamInfo, SanitizedCamera } from '../types';
import { isSimulatedTarget, simulateConnection } from './simulation';

const CONNECT_TIMEOUT_MS = 5000;

/**
 * Perform a real RTSP reachability check: TCP connect to host:port followed
 * by an RTSP OPTIONS handshake. The response status line determines whether
 * the device is online, degraded (reachable but not answering RTSP / auth
 * rejected) or offline.
 */
function probeRtsp(
  host: string,
  port: number,
  path: string | null | undefined
): Promise<{ success: boolean; status: CameraStatus; responseTimeMs: number; error?: string }> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    let buffer = '';

    const finish = (result: { success: boolean; status: CameraStatus; error?: string }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, responseTimeMs: Date.now() - startedAt });
    };

    const socket = net.connect({ host, port });
    socket.setTimeout(CONNECT_TIMEOUT_MS);

    socket.on('connect', () => {
      const target = `rtsp://${host}:${port}${path || '/'}`;
      const request =
        `OPTIONS ${target} RTSP/1.0\r\n` +
        'CSeq: 1\r\n' +
        'User-Agent: DukaanOS-HealthCheck/1.0\r\n' +
        '\r\n';
      socket.write(request);
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const headerEnd = buffer.indexOf('\r\n');
      const statusLine = headerEnd >= 0 ? buffer.slice(0, headerEnd) : buffer;
      const match = /^RTSP\/\d\.\d\s+(\d{3})/.exec(statusLine);
      if (!match) {
        if (buffer.length > 512) {
          finish({
            success: true,
            status: 'DEGRADED',
            error: 'Port is open but the device did not answer the RTSP OPTIONS handshake.',
          });
        }
        return;
      }
      const code = Number(match[1]);
      if (code >= 200 && code < 400) {
        finish({ success: true, status: 'ONLINE' });
      } else if (code === 401 || code === 403) {
        finish({
          success: true,
          status: 'DEGRADED',
          error: `Camera rejected the RTSP handshake (${code} Unauthorized). Check the stored camera credentials.`,
        });
      } else {
        finish({
          success: true,
          status: 'DEGRADED',
          error: `RTSP server responded with status ${code}.`,
        });
      }
    });

    socket.on('timeout', () => {
      finish({
        success: false,
        status: 'OFFLINE',
        error: `Connection to ${host}:${port} timed out after ${CONNECT_TIMEOUT_MS}ms.`,
      });
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      const reason =
        err.code === 'ENOTFOUND'
          ? `Host ${host} could not be resolved (DNS failure).`
          : `Could not reach ${host}:${port} (${err.code || err.message}).`;
      finish({ success: false, status: 'OFFLINE', error: reason });
    });
  });
}

export class RtspCameraProvider implements CameraProvider {
  protocol = 'RTSP';

  async testConnection(
    config: { host?: string | null; port?: number | null; path?: string | null },
    secrets?: { username?: string; password?: string }
  ): Promise<{
    success: boolean;
    status: CameraStatus;
    responseTimeMs?: number;
    error?: string;
  }> {
    const { host, port = 554, path } = config;

    if (!host || host.trim() === '') {
      return {
        success: false,
        status: 'OFFLINE',
        error: 'Host IP address or hostname is required for RTSP camera connection.',
      };
    }

    // Private/LAN/placeholder hosts cannot be reached from the app server
    // (media-gateway architecture); resolve them deterministically.
    if (isSimulatedTarget(host)) {
      return simulateConnection(host);
    }

    void secrets;
    return probeRtsp(host.trim(), port || 554, path);
  }

  async getStreamInfo(
    camera: SanitizedCamera,
    secrets?: { username?: string; password?: string }
  ): Promise<CameraStreamInfo> {
    // If an authenticated HLS or WebRTC gateway endpoint is configured:
    if (camera.hlsStreamUrl && camera.hlsStreamUrl.trim() !== '') {
      return {
        streamAvailable: true,
        streamType: 'HLS',
        streamUrl: camera.hlsStreamUrl,
        message: 'Live stream available via browser-compatible media gateway.',
      };
    }

    void secrets;

    // Honest architectural communication when only raw RTSP stream is configured
    return {
      streamAvailable: false,
      streamType: 'GATEWAY_REQUIRED',
      message:
        'Raw RTSP streams cannot be played directly inside web browsers. Configure an HLS / WebRTC media gateway (e.g. MediaMTX / go2rtc / WebRTC Bridge) to stream live video to the dashboard.',
    };
  }
}
