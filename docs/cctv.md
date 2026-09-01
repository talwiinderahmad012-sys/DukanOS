# DukaanOS — Remote CCTV, Device Monitoring & Security Camera Foundation (Step 16)

## Overview
Step 16 introduces a vendor-agnostic security camera and device monitoring foundation for DukaanOS. It enables retail store owners to manage IP cameras, NVR/DVR channels, and RTSP/ONVIF devices across multiple branches, track real-time device health, receive deduplicated offline alerts, and monitor physical store zones remotely without burdening the application server with raw video storage.

---

## 1. Zero Video Storage Principle
DukaanOS acts strictly as a **connection coordinator and device health monitor**:
- Continuous raw CCTV video is **never** uploaded or stored on DukaanOS cloud servers.
- This design ensures zero cloud storage cost bloat, low network bandwidth usage, and high security.

---

## 2. Browser Playback & Media Gateway Architecture

### RTSP Web Limitations
Standard web browsers cannot consume raw RTSP/UDP streams directly. To provide live streaming in web dashboards, a lightweight media gateway is used in production:

```text
On-Premise Cameras (RTSP/ONVIF)
              ↓
Local Media Gateway (e.g. MediaMTX / go2rtc / WebRTC Bridge)
              ↓
Browser-Compatible Stream (HLS .m3u8 / WebRTC)
              ↓
DukaanOS Web Dashboard (/dashboard/cameras/[id])
```

- **Honest Stream Status**: If only a raw RTSP URL is configured, DukaanOS displays a clear explanation that a media gateway is required for browser playback, avoiding fake video players.
- **HLS / WebRTC Endpoint**: When an HLS stream URL is provided (`hlsStreamUrl`), DukaanOS renders the live stream natively in the dashboard.

---

## 3. Strict Credential Protection & Secret Isolation
- Sensitive camera authentication (usernames, passwords, private RTSP auth headers) is stored in the database within `Camera.encryptedSecrets`.
- **Encryption at rest**: values are serialized as `enc:v1:<iv>.<authTag>.<ciphertext>` using **AES-256-GCM** ([`src/lib/security/encryption.ts`](file:///d:/DukanOS/src/lib/security/encryption.ts)). The 32-byte key is supplied only via the `CCTV_SECRETS_ENCRYPTION_KEY` environment variable (`openssl rand -hex 32`) and never appears in source control or API responses.
- **Fail-closed writes**: registering or updating camera credentials without a configured encryption key is rejected with a server error instead of silently storing plaintext.
- **Legacy upgrade**: plaintext values written before encryption existed are still read for compatibility and are transparently re-encrypted on the next health check or update.
- Sanitize functions in [`src/services/cctv/cameras.ts`](file:///d:/DukanOS/src/services/cctv/cameras.ts) **strictly strip secrets** from all public responses.
- Client-side React components only receive public metadata (`host`, `port`, `location`, `status`, `hasCredentials: true`), preventing credentials from leaking in browser devtools or component state.
- `branchId` on camera create/update is validated to belong to the same business before any write.

---

## 4. Role-Based Access Control
- **OWNER**: Full access to register, configure, test, view, and archive cameras.
- **MANAGER**: Register, configure, test, view and run health checks (archiving is OWNER-only).
- **CASHIER & EMPLOYEE**: Strictly denied access (`403 Forbidden` / redirect).

---

## 4.1 Connectivity Probes
Providers in [`src/services/cctv/providers`](file:///d:/DukanOS/src/services/cctv/providers) perform **real reachability checks** for routable targets:
- **RTSP**: TCP connect + `OPTIONS` handshake (`rtsp.provider.ts`); a 2xx/3xx status line ⇒ `ONLINE`, `401/403` ⇒ `DEGRADED` with an authentication error, connect failure/timeout ⇒ `OFFLINE`.
- **ONVIF**: unauthenticated SOAP `GetSystemDateAndTime` probe against `/onvif/device_service` (`onvif.provider.ts`).
- **CLOUD**: real HTTP probe of the configured stream/health URL (`cloud.provider.ts`).
- **Deterministic simulation**: private/LAN/loopback hosts (`192.168.*`, `10.*`, `127.*`, `localhost`, `mock-*`, …) cannot be reached from the app server in the media-gateway architecture, so they resolve through the deterministic simulated probe (`simulation.ts`). Set `CCTV_SIMULATE_PROVIDERS=1` to force simulation for every target (used by local development and the integration test suite) or `0` to disable it.
- Health events classify failures with a coarse `errorCategory`: `NONE`, `TIMEOUT`, `DNS_ERROR`, `AUTHENTICATION_ERROR`, `CONNECTION_ERROR`.

---

---

## 5. Health Monitoring & Deduplicated Alerts
- **Server Health Check Service**: [`checkCameraHealth(businessId, cameraId)`](file:///d:/DukanOS/src/services/cctv/health.ts) tests connectivity, response time (ms), and logs a `CameraHealthEvent`.
- **Deduplicated Offline Alerts**:
  - When a camera goes `OFFLINE` or `DEGRADED`, an alert notification with deduplication key `CAMERA_OFFLINE-${businessId}-${cameraId}` is created for the store owner.
  - Repeated health checks during the same outage **do not spam duplicate notifications**.
- **Recovery Notification**:
  - When the camera returns `ONLINE` from an offline state, a recovery notification is dispatched: `[SUCCESS] ${camera.name} is back online`.

---

## 6. Remote Monitoring Cockpit Integration
- **Monitoring Cockpit (`/dashboard/monitoring`)**:
  - Displays live camera availability count (`Online / Total`) in the **Security Camera Live Status** panel (online / degraded / offline breakdown).
  - Lists offline or degraded cameras by name and location, with a direct link to the CCTV panel.
  - Highlights unreachable cameras as an alert row in the **Owner Action Center** (data served by `getRemoteBusinessStatus` in [`src/services/monitoring.ts`](file:///d:/DukanOS/src/services/monitoring.ts)).

---

## 7. Verification & Build
- Automated integration test suite: [`src/scripts/test_cctv_monitoring.ts`](file:///d:/DukanOS/src/scripts/test_cctv_monitoring.ts) — run with `CCTV_SECRETS_ENCRYPTION_KEY` and (optionally) `CCTV_SIMULATE_PROVIDERS=1` configured in `.env`.
- Scheduled maintenance: `POST /api/cron` (Bearer `CRON_SECRET`) re-checks every enabled camera, logs `CameraHealthEvent` rows, and dispatches deduplicated alerts.
- Production build: `npm run build`.
