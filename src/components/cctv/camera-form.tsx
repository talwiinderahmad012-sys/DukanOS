'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Video, 
  ArrowLeft, 
  Save, 
  Activity, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Server
} from 'lucide-react';
import { createCameraAction, testCameraConnectionAction } from '@/app/actions/cctv.actions';

export function CameraForm({
  businessId,
  branches,
}: {
  businessId: string;
  branches: Array<{ id: string; name: string; code: string }>;
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    code: '',
    location: '',
    branchId: '',
    type: 'IP_CAMERA',
    protocol: 'RTSP',
    host: '',
    port: 554,
    path: '',
    hlsStreamUrl: '',
    username: '',
    password: '',
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; status?: string; message?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProtocolChange = (prot: string) => {
    setForm({
      ...form,
      protocol: prot,
      port: prot === 'RTSP' ? 554 : prot === 'ONVIF' ? 80 : 443,
    });
  };

  const handleTestConnection = async () => {
    if (!form.host) {
      setErrorMsg('Please enter a host IP address or domain name to test connection.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMsg(null);

    const res = await testCameraConnectionAction(businessId, {
      protocol: form.protocol,
      host: form.host,
      port: Number(form.port),
      path: form.path,
      username: form.username || undefined,
      password: form.password || undefined,
    });

    if (res.success && res.data) {
      const data = res.data as any;
      setTestResult({
        success: data.success,
        status: data.status,
        message: data.success
          ? `Connection established! Status: ${data.status} (${data.responseTimeMs || 25}ms)`
          : `Connection failed: ${data.error || 'Host unreachable'}`,
      });
    } else {
      setTestResult({
        success: false,
        message: res.message || 'Connection test failed.',
      });
    }
    setTesting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Camera name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await createCameraAction(businessId, {
      name: form.name,
      code: form.code || undefined,
      location: form.location || undefined,
      branchId: form.branchId || undefined,
      type: form.type as any,
      protocol: form.protocol,
      host: form.host || undefined,
      port: Number(form.port) || 554,
      path: form.path || undefined,
      hlsStreamUrl: form.hlsStreamUrl || undefined,
      username: form.username || undefined,
      password: form.password || undefined,
    });

    if (res.success) {
      router.push('/dashboard/cameras');
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to register camera.');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div>
        <Link
          href="/dashboard/cameras"
          className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cameras</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Register Security Camera</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Connect an on-premise IP camera, NVR channel, or RTSP/ONVIF security stream.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {testResult && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            testResult.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
        {/* Section 1: Device Identification */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            1. Camera Identification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Camera Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Cash Counter Cam 1"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Location / Zone</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Main Entrance, Billing Counter, Warehouse"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {branches.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">Branch / Group</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Main Store --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Device Hardware Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="IP_CAMERA">IP Camera (Standalone)</option>
                <option value="NVR">Network Video Recorder (NVR Channel)</option>
                <option value="DVR">Digital Video Recorder (DVR)</option>
                <option value="ONVIF">ONVIF Compliant Device</option>
                <option value="RTSP">RTSP Stream Generic</option>
                <option value="CLOUD_CAMERA">Cloud Hosted Camera</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Connection Protocol & Network Host */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            2. Network Connection & Stream
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Protocol</label>
              <select
                value={form.protocol}
                onChange={(e) => handleProtocolChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="RTSP">RTSP (Port 554)</option>
                <option value="ONVIF">ONVIF (Port 80)</option>
                <option value="CLOUD">Cloud / HTTPS Stream</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-700 block">Host IP / Domain *</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="e.g. 192.168.1.120 or camera.mystore.com"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Port</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-700 block">Stream Path / Channel</label>
              <input
                type="text"
                value={form.path}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                placeholder="e.g. /live/ch0 or /Streaming/Channels/101"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">
              Browser-Compatible HLS / WebRTC Stream URL (Optional)
            </label>
            <input
              type="text"
              value={form.hlsStreamUrl}
              onChange={(e) => setForm({ ...form, hlsStreamUrl: e.target.value })}
              placeholder="e.g. https://gateway.mystore.com/live/cam1/index.m3u8"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-400">
              Provide this if you have a local media gateway (MediaMTX / go2rtc) to enable real-time browser playback.
            </p>
          </div>
        </div>

        {/* Section 3: Credentials */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              <span>3. Device Authentication (Server-Secured)</span>
            </h2>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              Encrypted Server-Side Only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="admin"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !form.host}
            className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{testing ? 'Testing Connection...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link
              href="/dashboard/cameras"
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Register Camera'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
