'use client';

const DB_NAME = 'dukaanos_offline_db';
const DB_VERSION = 1;

export type SyncQueueStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export type QueuedTransaction = {
  id: string; // clientTransactionId (UUID)
  businessId: string;
  type: 'POS_SALE';
  payload: any;
  status: SyncQueueStatus;
  createdAt: string;
  syncedAt?: string;
  retryCount: number;
  lastError?: string;
  invoiceNumber?: string;
  summary: {
    itemCount: number;
    total: number;
    customerName?: string;
  };
};

export type CachedProduct = {
  id: string;
  businessId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  currentStock: number;
  category?: { id: string; name: string } | null;
  cachedAt: string;
};

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. POS Catalog Cache
      if (!db.objectStoreNames.contains('pos_catalog_cache')) {
        const catalogStore = db.createObjectStore('pos_catalog_cache', { keyPath: 'id' });
        catalogStore.createIndex('businessId', 'businessId', { unique: false });
      }

      // 2. Offline Sync Queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('businessId', 'businessId', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ----------------------------------------
// Catalog Cache Operations
// ----------------------------------------

export async function saveCatalogToCache(
  businessId: string,
  products: Array<{
    id: string;
    name: string;
    sku?: string | null;
    barcode?: string | null;
    unit: string;
    sellingPrice: number;
    purchasePrice: number;
    currentStock: number;
    category?: { id: string; name: string } | null;
  }>
): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('pos_catalog_cache', 'readwrite');
    const store = tx.objectStore('pos_catalog_cache');
    const cachedAt = new Date().toISOString();

    for (const p of products) {
      store.put({
        ...p,
        businessId,
        cachedAt,
      });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to cache catalog:', err);
  }
}

export async function getCachedCatalog(businessId: string): Promise<CachedProduct[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('pos_catalog_cache', 'readonly');
    const store = tx.objectStore('pos_catalog_cache');
    const index = store.index('businessId');
    const request = index.getAll(IDBKeyRange.only(businessId));

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to retrieve cached catalog:', err);
    return [];
  }
}

// ----------------------------------------
// Sync Queue Operations
// ----------------------------------------

export async function enqueueSyncTransaction(transaction: QueuedTransaction): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  store.put(transaction);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSyncQueue(businessId?: string): Promise<QueuedTransaction[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    // When no businessId is given (global reconnect sync), return every queued
    // transaction; each record carries its own businessId.
    const request =
      businessId !== undefined
        ? store.index('businessId').getAll(IDBKeyRange.only(businessId))
        : store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const items = request.result || [];
        // Sort chronologically ascending
        items.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to load sync queue:', err);
    return [];
  }
}

export async function updateSyncTransaction(
  id: string,
  updates: Partial<QueuedTransaction>
): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const getReq = store.get(id);

  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) {
        return resolve();
      }
      const updated = { ...existing, ...updates };
      store.put(updated);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeSyncTransaction(id: string): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSyncedTransactions(businessId: string): Promise<void> {
  const items = await getAllSyncQueue(businessId);
  const syncedIds = items.filter((i) => i.status === 'SYNCED').map((i) => i.id);

  if (syncedIds.length === 0) return;

  const db = await openOfflineDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');

  for (const id of syncedIds) {
    store.delete(id);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
