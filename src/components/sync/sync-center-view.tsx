'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Trash2, 
  ArrowRight,
  ShieldCheck,
  Layers,
  HelpCircle
} from 'lucide-react';
import { 
  getAllSyncQueue, 
  clearSyncedTransactions, 
  removeSyncTransaction, 
  updateSyncTransaction,
  QueuedTransaction 
} from '@/lib/offline/db';
import { processSyncQueue, isCurrentlySyncing } from '@/lib/offline/sync-manager';
import { usePWA } from '@/components/pwa/pwa-provider';
import { useTranslation } from '@/lib/i18n/language-context';

export function SyncCenterView({ businessId }: { businessId: string }) {
  const { t, tm, language, formatCurrency } = useTranslation();
  const langLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const { networkStatus } = usePWA();
  const [queue, setQueue] = useState<QueuedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      const items = await getAllSyncQueue(businessId);
      setQueue(items);
      const syncedItems = items.filter((i) => i.status === 'SYNCED');
      if (syncedItems.length > 0) {
        const latest = syncedItems[syncedItems.length - 1].syncedAt;
        if (latest) setLastSyncTime(latest);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();

    const handleSyncUpdated = () => {
      loadQueue();
      setSyncing(isCurrentlySyncing());
    };

    window.addEventListener('dukaanos:sync-updated', handleSyncUpdated);
    return () => {
      window.removeEventListener('dukaanos:sync-updated', handleSyncUpdated);
    };
  }, [businessId]);

  const handleManualSync = async () => {
    if (syncing || networkStatus === 'OFFLINE') return;
    setSyncing(true);
    await processSyncQueue(businessId);
    setSyncing(false);
    await loadQueue();
  };

  const handleClearSynced = async () => {
    await clearSyncedTransactions(businessId);
    await loadQueue();
  };

  const handleRetryItem = async (id: string) => {
    await updateSyncTransaction(id, { status: 'PENDING', lastError: undefined });
    await handleManualSync();
  };

  const handleDeleteItem = async (id: string) => {
    await removeSyncTransaction(id);
    await loadQueue();
  };

  // Metrics
  const pendingCount = queue.filter((i) => i.status === 'PENDING' || i.status === 'SYNCING').length;
  const syncedCount = queue.filter((i) => i.status === 'SYNCED').length;
  const conflictCount = queue.filter((i) => i.status === 'CONFLICT').length;
  const failedCount = queue.filter((i) => i.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('sync.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('sync.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {syncedCount > 0 && (
            <button
              onClick={handleClearSynced}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('sync.clearSynced')}</span>
            </button>
          )}

          <button
            onClick={handleManualSync}
            disabled={syncing || networkStatus === 'OFFLINE'}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? t('sync.syncingQueue') : t('sync.syncNow')}</span>
          </button>
        </div>
      </div>

      {/* Connection & Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Device Network Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            {t('sync.deviceConnection')}
          </span>
          <div className="flex items-center gap-2 pt-1">
            {networkStatus === 'ONLINE' ? (
              <>
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-lg font-bold text-emerald-700">{t('sync.onlineConnected')}</span>
              </>
            ) : networkStatus === 'RECONNECTING' ? (
              <>
                <div className="w-3 h-3 rounded-full bg-primary-soft0 animate-pulse"></div>
                <span className="text-lg font-bold text-gray-950">{t('sync.reconnecting')}</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-lg font-bold text-amber-700">{t('sync.offlineMode')}</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-gray-400 block pt-1">
            {lastSyncTime
              ? t('sync.lastSynced', { time: new Date(lastSyncTime).toLocaleTimeString(langLocale, { hour: '2-digit', minute: '2-digit' }) })
              : t('sync.noSyncedSales')}
          </span>
        </div>

        {/* Pending Sync */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('sync.pendingOfflineSales')}</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</h3>
          <span className="text-[11px] text-gray-900">{t('sync.awaitingAutoSync')}</span>
        </div>

        {/* Conflicts */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          conflictCount > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-gray-200'
        }`}>
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">{t('sync.inventoryConflicts')}</span>
          <h3 className={`text-2xl font-bold mt-1 ${conflictCount > 0 ? 'text-amber-800' : 'text-gray-900'}`}>
            {conflictCount}
          </h3>
          <span className="text-[11px] text-amber-700">{t('sync.stockChangedBeforeSync')}</span>
        </div>

        {/* Synced Total */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">{t('sync.syncedTransactions')}</span>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{syncedCount}</h3>
          <span className="text-[11px] text-emerald-600">{t('sync.committedToServer')}</span>
        </div>
      </div>

      {/* Transaction Queue Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
            {t('sync.queueTitle', { count: queue.length })}
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">{t('sync.loadingQueue')}</div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">{t('sync.queueClear')}</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {t('sync.queueClearDesc')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {queue.map((item) => {
              const isSynced = item.status === 'SYNCED';
              const isConflict = item.status === 'CONFLICT';
              const isFailed = item.status === 'FAILED';
              const isPending = item.status === 'PENDING' || item.status === 'SYNCING';

              return (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isSynced
                          ? 'bg-emerald-100 text-emerald-800'
                          : isConflict
                          ? 'bg-amber-100 text-amber-800'
                          : isFailed
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-gray-900'
                      }`}>
                        {t(`sync.statuses.${item.status}`, item.status)}
                      </span>

                      <span className="font-mono text-xs text-gray-500">
                        UUID: {item.id.slice(0, 8)}...
                      </span>

                      {item.invoiceNumber && (
                        <span className="font-mono text-xs font-bold text-gray-900">
                          {item.invoiceNumber}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-700">
                      <strong>{t('sync.posSaleLabel')}</strong> {t('sync.itemsCount', { count: item.summary.itemCount })} • {t('common.total')}: {formatCurrency(item.summary.total)}
                      {item.summary.customerName && ` • ${t('common.customer')}: ${item.summary.customerName}`}
                    </p>

                    {/* Conflict / Error Explanation */}
                    {item.lastError && (
                      <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 mt-2 ${
                        isConflict ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-rose-50 border border-rose-200 text-rose-900'
                      }`}>
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold block">
                            {isConflict ? t('sync.stockConflictDetected') : t('sync.syncError')}
                          </span>
                          <span className="text-[11px]">{tm(item.lastError)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <span className="text-[11px] text-gray-400 font-mono">
                      {new Date(item.createdAt).toLocaleString(langLocale, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {(isFailed || isConflict) && (
                      <button
                        onClick={() => handleRetryItem(item.id)}
                        className="px-3 py-1.5 bg-primary-soft hover:bg-blue-100 text-gray-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{t('common.retry')}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      title={t('sync.deleteQueueEntry')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
