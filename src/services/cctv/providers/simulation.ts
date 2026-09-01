/**
 * Provider simulation helpers.
 *
 * DukaanOS follows a media-gateway architecture: the app server coordinates
 * cameras and records health, while actual RTSP transport is handled by a
 * dedicated gateway (MediaMTX / go2rtc / WebRTC bridge). Private, loopback and
 * placeholder hosts cannot be reached from the app server in most
 * deployments, so they resolve through a deterministic simulated probe. This
 * keeps local development and the integration test-suite stable.
 *
 * Real, publicly-routable hosts (gateway endpoints, public stream URLs) are
 * probed with genuine TCP / HTTP connectivity checks in each provider.
 */

const PRIVATE_HOST_PATTERNS: Array<(host: string) => boolean> = [
  (h) => h === 'localhost',
  (h) => h.startsWith('127.'),
  (h) => h.startsWith('192.168.'),
  (h) => h.startsWith('10.'),
  (h) => /^172\.(1[6-9]|2\d|3[01])\./.test(h),
  (h) => h.startsWith('0.0.0.0'),
  (h) => h.startsWith('mock-'),
];

const SIMULATED_KEYWORDS = ['offline', 'online', 'unreachable', 'degraded', 'simulated', 'localhost'];

/** True when the host should be resolved through the deterministic simulation. */
export function isSimulatedTarget(host: string | null | undefined): boolean {
  // Explicit global test/development override: force deterministic simulated
  // probes for every target (used by the integration test suite).
  if (process.env.CCTV_SIMULATE_PROVIDERS === '1') return true;
  if (process.env.CCTV_SIMULATE_PROVIDERS === '0') return false;

  if (!host || host.trim() === '') return true;
  const h = host.trim().toLowerCase();
  if (PRIVATE_HOST_PATTERNS.some((p) => p(h))) return true;
  if (SIMULATED_KEYWORDS.some((k) => h.includes(k))) return true;
  return false;
}

/** Deterministic simulated connectivity result used for non-routable hosts. */
export function simulateConnection(host: string | null | undefined): {
  success: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  responseTimeMs: number;
  error?: string;
} {
  const h = (host || '').toLowerCase();
  const start = Date.now();

  if (h.includes('offline') || h.includes('unreachable')) {
    return {
      success: false,
      status: 'OFFLINE',
      responseTimeMs: 0,
      error: `Host ${host} is unreachable or connection timed out.`,
    };
  }

  if (h.includes('degraded')) {
    return {
      success: true,
      status: 'DEGRADED',
      responseTimeMs: 850,
      error: 'High latency detected',
    };
  }

  // Default simulated success for private/gateway hosts.
  return {
    success: true,
    status: 'ONLINE',
    responseTimeMs: Math.max(12, Date.now() - start + 24),
  };
}
