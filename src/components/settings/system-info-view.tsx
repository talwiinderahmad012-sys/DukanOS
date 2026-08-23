'use client';

import Link from 'next/link';
import { 
  Activity, 
  ArrowLeft, 
  Database, 
  ShieldCheck, 
  Wifi, 
  Bell, 
  MessageSquare, 
  Video,
  Layers
} from 'lucide-react';

export function SystemInfoView({
  diagnostics,
}: {
  diagnostics: any;
}) {
  const { version, environment, serverTime, diagnostics: sys, counts } = diagnostics;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">System Diagnostics & Information</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Live technical health status of database queries, background services, and system capabilities.
        </p>
      </div>

      {/* Version & Environment Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Software Version</span>
          <span className="font-bold text-base text-gray-900 font-mono">DukaanOS v{version}</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Environment</span>
          <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-mono font-bold">
            {environment.toUpperCase()}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Server Clock</span>
          <span className="font-mono text-xs text-gray-600">
            {new Date(serverTime).toLocaleTimeString()} ({new Date(serverTime).toLocaleDateString()})
          </span>
        </div>
      </div>

      {/* System Subsystems Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Database */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                sys.database.status === 'HEALTHY'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              ● {sys.database.status}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Database Engine</h3>
            <p className="text-xs text-gray-500">{sys.database.engine}</p>
          </div>
          <div className="text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-100 flex justify-between">
            <span>Ping roundtrip:</span>
            <span className="font-bold text-gray-700">{sys.database.latencyMs} ms</span>
          </div>
        </div>

        {/* Auth Subsystem */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700">
              ● {sys.auth.status}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Authentication & Security</h3>
            <p className="text-xs text-gray-500">{sys.auth.strategy}</p>
          </div>
          <div className="text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-100 flex justify-between">
            <span>Role guard:</span>
            <span className="font-bold text-gray-700">Multi-tenant RBAC</span>
          </div>
        </div>

        {/* PWA & Sync */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700">
              ● {sys.pwaSync.status}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">PWA & Offline POS Sync</h3>
            <p className="text-xs text-gray-500">IndexedDB Queue & Service Worker</p>
          </div>
          <div className="text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-100 flex justify-between">
            <span>Conflict safety:</span>
            <span className="font-bold text-gray-700">Idempotency Keys</span>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700">
              ● {sys.pushNotifications.status}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Web Push Notifications</h3>
            <p className="text-xs text-gray-500">{sys.pushNotifications.service}</p>
          </div>
          <div className="text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-100 flex justify-between">
            <span>Digest engine:</span>
            <span className="font-bold text-gray-700">Timezone-aware</span>
          </div>
        </div>

        {/* Communications Gateway */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700">
              ● {sys.communicationsGateway.status}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Messaging Gateway</h3>
            <p className="text-xs text-gray-500">WhatsApp, SMS & Email</p>
          </div>
          <div className="text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-100 flex justify-between">
            <span>Active providers:</span>
            <span className="font-bold text-gray-700">{sys.communicationsGateway.activeProvidersCount}</span>
          </div>
        </div>

        {/* CCTV Security */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-teal-50 text-teal-700">
              ● {sys.cctvSecurity.status}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Security Camera System</h3>
            <p className="text-xs text-gray-500">RTSP & ONVIF Monitoring</p>
          </div>
          <div className="text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-100 flex justify-between">
            <span>Registered devices:</span>
            <span className="font-bold text-gray-700">{sys.cctvSecurity.registeredDevices}</span>
          </div>
        </div>
      </div>

      {/* Tenant Ledger Summary */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-500" />
          <span>Active Business Ledger Counts</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-gray-50 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Products</span>
            <div className="font-bold text-base text-gray-900 font-mono mt-0.5">{counts.products}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Sales Records</span>
            <div className="font-bold text-base text-gray-900 font-mono mt-0.5">{counts.sales}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Customers</span>
            <div className="font-bold text-base text-gray-900 font-mono mt-0.5">{counts.customers}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Team Members</span>
            <div className="font-bold text-base text-gray-900 font-mono mt-0.5">{counts.members}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Cameras</span>
            <div className="font-bold text-base text-gray-900 font-mono mt-0.5">{counts.cameras}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
