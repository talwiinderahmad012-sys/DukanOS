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
- Sanitize functions in [`src/services/cctv/cameras.ts`](file:///d:/DukanOS/src/services/cctv/cameras.ts) **strictly strip secrets** from all public responses.
- Client-side React components only receive public metadata (`host`, `port`, `location`, `status`, `hasCredentials: true`), preventing credentials from leaking in browser devtools or component state.

---

## 4. Role-Based Access Control
- **OWNER**: Full access to register, configure, test, view, and archive cameras.
- **MANAGER**: Read access and operational health checking.
- **CASHIER & EMPLOYEE**: Strictly denied access (`403 Forbidden` / redirect).

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
  - Displays live camera availability count (`Online / Total`).
  - Displays the **Security Camera Live Status Grid** showing store zones and quick feed buttons.
  - Highlights offline cameras in the **Owner Action Center**.

---

## 7. Verification & Build
- Automated integration test suite: [`src/scripts/test_cctv_monitoring.ts`](file:///d:/DukanOS/src/scripts/test_cctv_monitoring.ts) (6/6 tests passing).
- Production build: `npm run build` (All 39 Next.js routes compiled cleanly).
