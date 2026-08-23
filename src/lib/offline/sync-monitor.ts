'use client';

import { getAllSyncQueue } from './db';

export type SyncHealth = {
  totalPending: number;
  totalSynced: number;
  totalConflicts: number;
  totalFailed: number;
  oldestPendingAge: string | null;
  lastSuccessfulSync: string | null;
  repeatedFailures: number;
};

function formatAge(createdAt: string): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}

function formatTimestamp(isoString: string | undefined): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleString();
}

export async function getSyncHealth(businessId: string): Promise<SyncHealth> {
  if (typeof window === 'undefined') {
    return {
      totalPending: 0,
      totalSynced: 0,
      totalConflicts: 0,
      totalFailed: 0,
      oldestPendingAge: null,
      lastSuccessfulSync: null,
      repeatedFailures: 0,
    };
  }

  try {
    const items = await getAllSyncQueue(businessId);

    const pendingItems = items.filter((i) => i.status === 'PENDING' || i.status === 'SYNCING');
    const syncedItems = items.filter((i) => i.status === 'SYNCED');
    const conflictItems = items.filter((i) => i.status === 'CONFLICT');
    const failedItems = items.filter((i) => i.status === 'FAILED');

    const oldestPending = [...pendingItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

    const lastSynced = [...syncedItems].sort(
      (a, b) => new Date(b.syncedAt || 0).getTime() - new Date(a.syncedAt || 0).getTime()
    )[0];

    const repeatedFailures = items.filter((i) => i.retryCount > 3).length;

    return {
      totalPending: pendingItems.length,
      totalSynced: syncedItems.length,
      totalConflicts: conflictItems.length,
      totalFailed: failedItems.length,
      oldestPendingAge: oldestPending ? formatAge(oldestPending.createdAt) : null,
      lastSuccessfulSync: formatTimestamp(lastSynced?.syncedAt),
      repeatedFailures,
    };
  } catch {
    return {
      totalPending: 0,
      totalSynced: 0,
      totalConflicts: 0,
      totalFailed: 0,
      oldestPendingAge: null,
      lastSuccessfulSync: null,
      repeatedFailures: 0,
    };
  }
}
