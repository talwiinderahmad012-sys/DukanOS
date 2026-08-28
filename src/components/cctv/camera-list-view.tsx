'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Video, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  RotateCcw, 
  Eye, 
  ShieldCheck,
  Server,
  MapPin,
  Building
} from 'lucide-react';
import { checkCameraHealthAction } from '@/app/actions/cctv.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export type CameraListItem = {
  id: string;
  name: string;
  location: string | null;
  branchName?: string;
  type: string;
  status: string;
  isEnabled: boolean;
  protocol: string;
  host: string | null;
  port: number | null;
  lastError: string | null;
  lastCheckedAt: string | null;
  lastOnlineAt: string | null;
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  ONLINE: 'cctv.statusOnline',
  OFFLINE: 'cctv.statusOffline',
  DEGRADED: 'cctv.statusDegraded',
  UNKNOWN: 'cctv.statusUnknown',
  DISABLED: 'cctv.statusDisabled',
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  IP_CAMERA: 'cctv.types.IP_CAMERA',
  NVR: 'cctv.types.NVR',
  DVR: 'cctv.types.DVR',
  ONVIF: 'cctv.types.ONVIF',
  RTSP: 'cctv.types.RTSP',
  CLOUD_CAMERA: 'cctv.types.CLOUD_CAMERA',
  OTHER: 'cctv.types.OTHER',
};

export function CameraListView({
  businessId,
  initialCameras,
  isOwner,
}: {
  businessId: string;
  initialCameras: CameraListItem[];
  isOwner: boolean;
}) {
  const { t, tm } = useTranslation();
  const [cameras, setCameras] = useState<CameraListItem[]>(initialCameras);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [healthMsg, setHealthMsg] = useState<{ id: string; text: string } | null>(null);

  const statusLabel = (status: string) => t(STATUS_LABEL_KEYS[status] ?? 'cctv.statusUnknown');
  const typeLabel = (type: string) => t(TYPE_LABEL_KEYS[type] ?? 'cctv.types.OTHER');

  const handleHealthCheck = async (cameraId: string) => {
    setCheckingId(cameraId);
    setHealthMsg(null);

    const res = await checkCameraHealthAction(businessId, cameraId);
    if (res.success && res.data) {
      const data = res.data as any;
      setHealthMsg({
        id: cameraId,
        text: t('cctv.healthCheckResult', {
          status: statusLabel(data.camera.status),
          latency: data.responseTimeMs ? `${data.responseTimeMs}ms` : t('cctv.noLatencyData'),
        }),
      });
      setCameras((prev) =>
        prev.map((c) =>
          c.id === cameraId
            ? {
                ...c,
                status: data.camera.status,
                lastCheckedAt: data.camera.lastCheckedAt,
                lastOnlineAt: data.camera.lastOnlineAt,
                lastError: data.camera.lastError,
              }
            : c
        )
      );
    } else {
      setHealthMsg({ id: cameraId, text: tm(res.message) || t('cctv.healthCheckFailed') });
    }
    setCheckingId(null);
  };

  const getStatusBadge = (status: string, isEnabled: boolean) => {
    if (!isEnabled) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-100 text-gray-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
          <span>{t('cctv.statusDisabled')}</span>
        </span>
      );
    }

    switch (status) {
      case 'ONLINE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>{t('cctv.statusOnline')}</span>
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            <span>{t('cctv.statusOffline')}</span>
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            <span>{t('cctv.statusDegraded')}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            <span>{t('cctv.statusUnknown')}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('cctv.pageTitle')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('cctv.pageSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/cameras/new"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('cctv.addCamera')}</span>
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('cctv.totalDevices')}</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{cameras.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{t('cctv.statusOnline')}</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {cameras.filter((c) => c.status === 'ONLINE' && c.isEnabled).length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wider">{t('cctv.statusOffline')}</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {cameras.filter((c) => c.status === 'OFFLINE' && c.isEnabled).length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">{t('cctv.statusDegraded')}</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {cameras.filter((c) => c.status === 'DEGRADED' && c.isEnabled).length}
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      {cameras.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-xs space-y-3">
          <Video className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">{t('cctv.emptyTitle')}</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {t('cctv.emptyDescription')}
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/cameras/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('cctv.registerFirstCamera')}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                    <Video className="w-5 h-5 text-gray-700" />
                  </div>
                  {getStatusBadge(camera.status, camera.isEnabled)}
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{camera.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{camera.location || t('cctv.mainArea')}</span>
                    </span>
                    {camera.branchName && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-gray-400" />
                        <span>{camera.branchName}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-2.5 space-y-1 text-[11px] font-mono text-gray-600 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('cctv.typeLabel')}</span>
                    <span className="font-bold text-gray-800">{typeLabel(camera.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('cctv.protocolLabel')}</span>
                    <span>{camera.protocol}</span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span className="text-gray-400">{t('cctv.hostLabel')}</span>
                    <span className="truncate max-w-[140px]">{camera.host || t('cctv.notAvailable')}:{camera.port || 554}</span>
                  </div>
                </div>

                {camera.lastError && (
                  <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded-lg truncate" title={tm(camera.lastError)}>
                    ⚠️ {tm(camera.lastError)}
                  </div>
                )}

                {healthMsg?.id === camera.id && (
                  <div className="text-[10px] text-gray-900 bg-primary-soft p-2 rounded-lg">
                    {healthMsg.text}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleHealthCheck(camera.id)}
                  disabled={checkingId === camera.id}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{checkingId === camera.id ? t('cctv.checking') : t('cctv.healthCheck')}</span>
                </button>

                <Link
                  href={`/dashboard/cameras/${camera.id}`}
                  className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('cctv.viewFeed')}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
