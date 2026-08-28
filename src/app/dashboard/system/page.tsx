import { Suspense } from 'react';
import { revalidatePath } from 'next/cache';

import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { requireBusinessAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { getAnalyticsCacheStats } from '@/lib/cache/analytics-cache';
import { MembershipRole } from '@/generated/prisma/client';
import { SystemHeaderClient, SystemClient, type SystemLogEntry } from './system-client';

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

function toLogEntries(logs: { id: string; action: string; entityType: string; createdAt: Date; userId: string | null }[]): SystemLogEntry[] {
  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    createdAt: log.createdAt.toISOString(),
    userIdPrefix: log.userId ? log.userId.slice(0, 8) : null,
  }));
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
      <SystemHeaderClient businessName={business.name} refreshAction={refreshSystemData} />

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
    <SystemClient
      appStatus={health?.status ?? 'unknown'}
      dbStatus={health?.database?.status ?? 'unknown'}
      readyStatus={ready?.status ?? 'unknown'}
      appHealthy={appHealthy}
      dbHealthy={dbHealthy}
      readyOk={readyOk}
      latencyMs={health?.database?.latencyMs ?? null}
      prismaReady={ready?.checks?.prisma ?? false}
      dbReady={ready?.checks?.database ?? false}
      healthTimestamp={health?.timestamp ?? null}
      uptimeSeconds={health?.uptimeSeconds ?? 0}
      version={APP_VERSION}
      hitRate={hitRate}
      cacheHits={cacheStats.hits}
      cacheMisses={cacheStats.misses}
      cacheEvictions={cacheStats.evictions}
      cacheEntries={cacheStats.size}
      errorLogs={toLogEntries(errorLogs)}
      recentLogs={toLogEntries(recentLogs)}
    />
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
