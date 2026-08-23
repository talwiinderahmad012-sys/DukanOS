import { Suspense } from 'react';
import { revalidatePath } from 'next/cache';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  History,
  Layers,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';

import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { requireBusinessAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { getAnalyticsCacheStats } from '@/lib/cache/analytics-cache';
import { MembershipRole } from '@/generated/prisma/client';

const APP_VERSION = '1.0.0';

async function refreshSystemData() {
  'use server';
  revalidatePath('/dashboard/system');
}

type HealthData = {
  status: 'healthy' | 'degraded';
  version: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  database: { status: string; latencyMs?: number };
};

type ReadyData = {
  status: 'ready' | 'not_ready';
  database: string;
  timestamp: string;
  checks: { database: boolean; prisma: boolean };
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function formatTime(ts?: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function StatusPill({ status, healthy }: { status: string; healthy: boolean }) {
  const color = healthy
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {status}
    </span>
  );
}

function StatItem({
  label,
  value,
  hint,
  emerald,
}: {
  label: string;
  value: string;
  hint?: string;
  emerald?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-xl font-bold ${emerald ? 'text-emerald-600' : 'text-gray-900'}`}>
        {value}
      </span>
      {hint ? <span className="text-[11px] text-gray-400">{hint}</span> : null}
    </div>
  );
}

export default async function SystemObservabilityPage() {
  const { business } = await getActiveBusiness();
  await requireBusinessAccess(business.id, [MembershipRole.OWNER]);

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    `http://localhost:${process.env.PORT ?? 3000}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-600" />
            System Observability
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Operational health and runtime metrics for {business.name}. Owner access only.
          </p>
        </div>
        <form action={refreshSystemData}>
          <button
            type="submit"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm shadow-sm"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
            Refresh
          </button>
        </form>
      </div>

      <Suspense fallback={<SystemSkeleton />}>
        <SystemDashboard businessId={business.id} baseUrl={baseUrl} />
      </Suspense>
    </div>
  );
}

async function SystemDashboard({
  businessId,
  baseUrl,
}: {
  businessId: string;
  baseUrl: string;
}) {
  const [health, ready, cacheStats, recentLogs, errorLogs] = await Promise.all([
    fetchJson<HealthData>(`${baseUrl}/api/health`),
    fetchJson<ReadyData>(`${baseUrl}/api/health/ready`),
    getAnalyticsCacheStats(),
    prisma.auditLog.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, entityType: true, createdAt: true, userId: true },
    }),
    prisma.auditLog.findMany({
      where: {
        businessId,
        OR: [
          { action: { contains: 'ERROR', mode: 'insensitive' } },
          { action: { contains: 'FAILED', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, entityType: true, createdAt: true, userId: true },
    }),
  ]);

  const appHealthy = health?.status === 'healthy';
  const dbHealthy = health?.database?.status === 'connected';
  const readyOk = ready?.status === 'ready';
  const hitRate =
    cacheStats.hits + cacheStats.misses > 0
      ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Application Status</h3>
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <StatusPill status={health?.status ?? 'unknown'} healthy={appHealthy} />
          <p className="text-xs text-gray-400">
            {appHealthy ? 'All systems operational' : 'Service degradation detected'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Database Status</h3>
            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <StatusPill status={health?.database?.status ?? 'unknown'} healthy={dbHealthy} />
          <p className="text-xs text-gray-400">
            {health?.database?.latencyMs !== undefined
              ? `${health.database.latencyMs}ms latency`
              : 'Reachability check'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Readiness</h3>
            <div className="h-8 w-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <StatusPill status={ready?.status ?? 'unknown'} healthy={readyOk} />
          <p className="text-xs text-gray-400">
            Prisma {ready?.checks?.prisma ? 'ready' : 'unchecked'} • DB{' '}
            {ready?.checks?.database ? 'ready' : 'unchecked'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Last Health Check</h3>
            <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-base font-semibold text-gray-900">{formatTime(health?.timestamp)}</p>
          <p className="text-xs text-gray-400">
            Uptime {formatUptime(health?.uptimeSeconds ?? 0)} • v{APP_VERSION}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              Cache Performance
            </h3>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
              {hitRate}% hit rate
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Hits" value={cacheStats.hits.toLocaleString()} emerald />
            <StatItem label="Misses" value={cacheStats.misses.toLocaleString()} />
            <StatItem label="Evictions" value={cacheStats.evictions.toLocaleString()} />
            <StatItem label="Entries" value={cacheStats.size.toLocaleString()} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Offline Sync Queue
            </h3>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              client-side
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Pending" value="N/A" />
            <StatItem label="Synced" value="N/A" />
            <StatItem label="Failed" value="N/A" />
            <StatItem label="Conflicts" value="N/A" />
          </div>
          <p className="text-[11px] text-gray-400 mt-4">
            Sync queue is managed locally in the browser and is not directly queryable from the server.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Recent Critical Errors
          </h3>
          <span className="text-xs text-gray-400">{errorLogs.length} matching logs</span>
        </div>
        {errorLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            No critical errors recorded. System is clean.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {errorLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{log.action}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {log.entityType}
                    {log.userId ? ` • user ${log.userId.slice(0, 8)}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatTime(log.createdAt.toISOString())}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Recent Audit Activity
          </h3>
          <span className="text-xs text-gray-400">Last 20 events</span>
        </div>
        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No audit activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{log.action}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {log.entityType}
                    {log.userId ? ` • user ${log.userId.slice(0, 8)}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatTime(log.createdAt.toISOString())}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SystemSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-12 w-full bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="py-3">
                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
