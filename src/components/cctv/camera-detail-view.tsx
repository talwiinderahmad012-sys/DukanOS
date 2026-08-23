'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Video, 
  ArrowLeft, 
  Activity, 
  Trash2, 
  MapPin, 
  Building, 
  Clock, 
  Server, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  RotateCcw,
  Info
} from 'lucide-react';
import { SanitizedCamera, CameraStreamInfo } from '@/services/cctv/types';
import { checkCameraHealthAction, archiveCameraAction } from '@/app/actions/cctv.actions';

export function CameraDetailView({
  businessId,
  camera: initialCamera,
  streamInfo,
  healthHistory,
  isOwner,
}: {
  businessId: string;
  camera: SanitizedCamera;
  streamInfo: CameraStreamInfo;
  healthHistory: any[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [camera, setCamera] = useState<SanitizedCamera>(initialCamera);
  const [checking, setChecking] = useState(false);
  const [healthMsg, setHealthMsg] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const handleHealthCheck = async () => {
    setChecking(true);
    setHealthMsg(null);

    const res = await checkCameraHealthAction(businessId, camera.id);
    if (res.success && res.data) {
      const data = res.data as any;
      setHealthMsg(
        `Health Check Result: ${data.camera.status} (${data.responseTimeMs ? `${data.responseTimeMs}ms` : 'online'})`
      );
      setCamera((prev) => ({
        ...prev,
        status: data.camera.status,
        lastCheckedAt: data.camera.lastCheckedAt,
        lastOnlineAt: data.camera.lastOnlineAt,
        lastError: data.camera.lastError,
      }));
    } else {
      setHealthMsg(res.message || 'Health check failed.');
    }
    setChecking(false);
  };

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${camera.name}"? This camera will be disabled from monitoring.`)) {
      return;
    }

    setArchiving(true);
    const res = await archiveCameraAction(businessId, camera.id);
    if (res.success) {
      router.push('/dashboard/cameras');
      router.refresh();
    } else {
      alert(res.message || 'Failed to archive camera.');
      setArchiving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/dashboard/cameras"
            className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Cameras</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{camera.name}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                camera.status === 'ONLINE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : camera.status === 'OFFLINE'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {camera.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleHealthCheck}
            disabled={checking}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{checking ? 'Checking Health...' : 'Check Health'}</span>
          </button>

          {isOwner && (
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Archive Camera</span>
            </button>
          )}
        </div>
      </div>

      {healthMsg && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{healthMsg}</span>
        </div>
      )}

      {/* Main Stream Area */}
      <div className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-lg">
        {streamInfo.streamAvailable && streamInfo.streamUrl ? (
          <div className="aspect-video w-full bg-black flex items-center justify-center relative">
            <video
              src={streamInfo.streamUrl}
              controls
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LIVE FEED</span>
            </div>
          </div>
        ) : (
          <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-radial from-gray-800 to-gray-950">
            <div className="w-16 h-16 rounded-3xl bg-gray-800 border border-gray-700 flex items-center justify-center">
              <Video className="w-8 h-8 text-gray-400" />
            </div>

            <div className="max-w-md space-y-1.5">
              <h3 className="text-sm font-bold text-white">Live Stream Gateway Required</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                {streamInfo.message}
              </p>
            </div>

            <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-3 max-w-md text-[11px] text-gray-300 font-mono flex items-center justify-between gap-4">
              <span className="text-gray-500">Source RTSP:</span>
              <span className="truncate">rtsp://{camera.host || '127.0.0.1'}:{camera.port || 554}{camera.path || ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Camera Information & Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Device Metadata
          </h2>

          <div className="space-y-3 text-xs divide-y divide-gray-100">
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Location Zone:</span>
              <span className="font-bold text-gray-900">{camera.location || 'Main Store'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Hardware Type:</span>
              <span className="font-bold text-gray-900">{camera.type}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Protocol:</span>
              <span className="font-bold text-gray-900">{camera.protocol}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Host / IP:</span>
              <span className="font-mono text-gray-800">{camera.host || 'N/A'}:{camera.port || 554}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Last Seen Online:</span>
              <span className="text-gray-700">
                {camera.lastOnlineAt ? new Date(camera.lastOnlineAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Health History Log */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Recent Health Checks
          </h2>

          {healthHistory.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No health checks logged yet.</p>
          ) : (
            <div className="space-y-2.5">
              {healthHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        h.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    ></span>
                    <span className="font-bold text-gray-800">{h.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500 text-[11px]">
                    {h.responseTimeMs && <span>{h.responseTimeMs}ms</span>}
                    <span>{new Date(h.checkedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
