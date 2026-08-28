'use client';

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
import { useTranslation } from '@/lib/i18n/language-context';

export type SystemLogEntry = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  userIdPrefix: string | null;
};

export type SystemDashboardData = {
  appStatus: string;
  dbStatus: string;
  readyStatus: string;
  appHealthy: boolean;
  dbHealthy: boolean;
  readyOk: boolean;
  latencyMs: number | null;
  prismaReady: boolean;
  dbReady: boolean;
  healthTimestamp: string | null;
  uptimeSeconds: number;
  version: string;
  hitRate: number;
  cacheHits: number;
  cacheMisses: number;
  cacheEvictions: number;
  cacheEntries: number;
  errorLogs: SystemLogEntry[];
  recentLogs: SystemLogEntry[];
};

const STATUS_KEYS: Record<string, string> = {
  healthy: 'system.statusHealthy',
  degraded: 'system.statusDegraded',
  connected: 'system.statusConnected',
  ready: 'system.statusReady',
  not_ready: 'system.statusNotReady',
  unknown: 'system.statusUnknown',
};

function StatusPill({ status, healthy }: { status: string; healthy: boolean }) {
  const { t } = useTranslation();
  const color = healthy
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status}
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

export function SystemHeaderClient({
  businessName,
  refreshAction,
}: {
  businessName: string;
  refreshAction: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-600" />
          {t('system.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('system.subtitle', { name: businessName })}
        </p>
      </div>
      <form action={refreshAction}>
        <button
          type="submit"
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm shadow-sm"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
          {t('system.refresh')}
        </button>
      </form>
    </div>
  );
}

export function SystemClient({
  appStatus,
  dbStatus,
  readyStatus,
  appHealthy,
  dbHealthy,
  readyOk,
  latencyMs,
  prismaReady,
  dbReady,
  healthTimestamp,
  uptimeSeconds,
  version,
  hitRate,
  cacheHits,
  cacheMisses,
  cacheEvictions,
  cacheEntries,
  errorLogs,
  recentLogs,
}: SystemDashboardData) {
  const { language, t, formatNumber } = useTranslation();
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const formatTime = (ts: string | null): string => {
    if (!ts) return t('common.dash');
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return t('common.dash');
    return d.toLocaleString(locale);
  };

  const formatUptime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return t('common.dash');
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return t('system.uptimeDays', { d: days, h: hours, m: mins });
    if (hours > 0) return t('system.uptimeHours', { h: hours, m: mins });
    return t('system.uptimeMinutes', { m: mins });
  };

  const notAvailable = t('system.notAvailable');

  const logRows = (logs: SystemLogEntry[], rowClassName = '') => (
    <div className="divide-y divide-gray-100">
      {logs.map((log) => (
        <div key={log.id} className={`py-3 flex items-center justify-between gap-4 ${rowClassName}`}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{log.action}</p>
            <p className="text-xs text-gray-400 truncate">
              {log.entityType}
              {log.userIdPrefix ? ` • ${t('system.userTag', { id: log.userIdPrefix })}` : ''}
            </p>
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {formatTime(log.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">{t('system.appStatus')}</h3>
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <StatusPill status={appStatus} healthy={appHealthy} />
          <p className="text-xs text-gray-400">
            {appHealthy ? t('system.allOperational') : t('system.degradationDetected')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">{t('system.dbStatus')}</h3>
            <div className="h-8 w-8 bg-primary-soft text-gray-900 rounded-lg flex items-center justify-center">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <StatusPill status={dbStatus} healthy={dbHealthy} />
          <p className="text-xs text-gray-400">
            {latencyMs !== null
              ? t('system.latencyMs', { ms: latencyMs })
              : t('system.reachabilityCheck')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">{t('system.readiness')}</h3>
            <div className="h-8 w-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <StatusPill status={readyStatus} healthy={readyOk} />
          <p className="text-xs text-gray-400">
            {t('system.readinessDetail', {
              prisma: t(prismaReady ? 'system.readyLabel' : 'system.uncheckedLabel'),
              db: t(dbReady ? 'system.readyLabel' : 'system.uncheckedLabel'),
            })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">{t('system.lastHealthCheck')}</h3>
            <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-base font-semibold text-gray-900">{formatTime(healthTimestamp)}</p>
          <p className="text-xs text-gray-400">
            {t('system.uptimeDetail', { uptime: formatUptime(uptimeSeconds), version })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              {t('system.cachePerformance')}
            </h3>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
              {t('system.hitRateBadge', { rate: hitRate })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label={t('system.hits')} value={formatNumber(cacheHits)} emerald />
            <StatItem label={t('system.misses')} value={formatNumber(cacheMisses)} />
            <StatItem label={t('system.evictions')} value={formatNumber(cacheEvictions)} />
            <StatItem label={t('system.entries')} value={formatNumber(cacheEntries)} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-900" />
              {t('system.offlineSyncQueue')}
            </h3>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {t('system.clientSideBadge')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label={t('system.pending')} value={notAvailable} />
            <StatItem label={t('system.synced')} value={notAvailable} />
            <StatItem label={t('system.failed')} value={notAvailable} />
            <StatItem label={t('system.conflicts')} value={notAvailable} />
          </div>
          <p className="text-[11px] text-gray-400 mt-4">
            {t('system.syncQueueNote')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {t('system.criticalErrorsTitle')}
          </h3>
          <span className="text-xs text-gray-400">{t('system.matchingLogs', { count: errorLogs.length })}</span>
        </div>
        {errorLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            {t('system.noCriticalErrors')}
          </div>
        ) : (
          logRows(errorLogs)
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            {t('system.auditTitle')}
          </h3>
          <span className="text-xs text-gray-400">{t('system.last20Events')}</span>
        </div>
        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">{t('system.noAuditActivity')}</div>
        ) : (
          logRows(recentLogs, 'hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors')
        )}
      </div>
    </div>
  );
}
