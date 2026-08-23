'use client';

import {
  getAllSyncQueue,
  updateSyncTransaction,
  QueuedTransaction,
  SyncQueueStatus
} from './db';
import { createSaleAction } from '@/app/actions/sale.actions';
import { logger } from '@/lib/logging/logger';

export type SyncResultSummary = {
  totalPending: number;
  synced: number;
  conflicts: number;
  failed: number;
};

let isSyncing = false;

export async function processSyncQueue(businessId: string): Promise<SyncResultSummary> {
  if (isSyncing || typeof window === 'undefined') {
    return { totalPending: 0, synced: 0, conflicts: 0, failed: 0 };
  }

  // Check if browser is online
  if (!navigator.onLine) {
    return { totalPending: 0, synced: 0, conflicts: 0, failed: 0 };
  }

  isSyncing = true;
  notifySyncStateChange();

  const summary: SyncResultSummary = {
    totalPending: 0,
    synced: 0,
    conflicts: 0,
    failed: 0,
  };

  try {
    const queue = await getAllSyncQueue(businessId);
    const pendingItems = queue.filter(
      (item) => item.status === 'PENDING' || item.status === 'FAILED'
    );

    summary.totalPending = pendingItems.length;

    logger.info('Sync started', {
      businessId,
      pendingCount: pendingItems.length,
      category: 'SYNC',
    });

    for (const item of pendingItems) {
      // 1. Mark as SYNCING
      await updateSyncTransaction(item.id, { status: 'SYNCING' });
      notifySyncStateChange();

      try {
        if (item.type === 'POS_SALE') {
          const payloadWithIdempotency = {
            ...item.payload,
            clientTransactionId: item.id,
          };

          const res = await createSaleAction(businessId, payloadWithIdempotency);

          if (res.success && res.data) {
            const saleData = res.data as any;
            await updateSyncTransaction(item.id, {
              status: 'SYNCED',
              syncedAt: new Date().toISOString(),
              invoiceNumber: saleData.invoiceNumber,
              lastError: undefined,
            });
            summary.synced += 1;

            logger.info('Sync item completed', {
              businessId,
              transactionId: item.id,
              invoiceNumber: saleData.invoiceNumber,
              category: 'SYNC',
            });
          } else {
            const isStockConflict =
              res.errorCode === 'INSUFFICIENT_STOCK' ||
              res.message?.toLowerCase().includes('stock');

            const status: SyncQueueStatus = isStockConflict ? 'CONFLICT' : 'FAILED';
            const errorMessage = isStockConflict
              ? 'This offline sale could not be completed because available stock changed while you were offline.'
              : res.message || 'Server rejected transaction during synchronization.';

            const newRetryCount = item.retryCount + 1;

            await updateSyncTransaction(item.id, {
              status,
              retryCount: newRetryCount,
              lastError: errorMessage,
            });

            if (isStockConflict) {
              summary.conflicts += 1;

              logger.warn('Sync conflict detected', {
                businessId,
                transactionId: item.id,
                errorCode: res.errorCode,
                reason: 'stock_conflict',
                category: 'SYNC',
              });
            } else {
              summary.failed += 1;

              logger.error('Sync item failed', {
                businessId,
                transactionId: item.id,
                errorCode: res.errorCode,
                errorMessage: res.message,
                retryCount: newRetryCount,
                category: 'SYNC',
              });
            }

            if (newRetryCount > 3) {
              logger.warn('Sync item repeated failure', {
                businessId,
                transactionId: item.id,
                retryCount: newRetryCount,
                status,
                category: 'SYNC',
              });
            }
          }
        }
      } catch (err: any) {
        const newRetryCount = item.retryCount + 1;

        await updateSyncTransaction(item.id, {
          status: 'FAILED',
          retryCount: newRetryCount,
          lastError: err.message || 'Network error during sync execution.',
        });
        summary.failed += 1;

        logger.error('Sync item error', {
          businessId,
          transactionId: item.id,
          errorMessage: err.message,
          retryCount: newRetryCount,
          category: 'SYNC',
        });

        if (newRetryCount > 3) {
          logger.warn('Sync item repeated failure', {
            businessId,
            transactionId: item.id,
            retryCount: newRetryCount,
            category: 'SYNC',
          });
        }
      }

      notifySyncStateChange();
    }
  } finally {
    isSyncing = false;
    notifySyncStateChange();
  }

  logger.info('Sync completed', {
    businessId,
    totalPending: summary.totalPending,
    synced: summary.synced,
    conflicts: summary.conflicts,
    failed: summary.failed,
    category: 'SYNC',
  });

  return summary;
}

export function isCurrentlySyncing(): boolean {
  return isSyncing;
}

export function notifySyncStateChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dukaanos:sync-updated'));
  }
}
