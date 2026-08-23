import 'server-only';

export type AnalyticsCacheStats = {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type EvictionCandidate = {
  key: string;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 512;

const store = new Map<string, CacheEntry<unknown>>();
let hits = 0;
let misses = 0;
let evictions = 0;

function nowMs() {
  return Date.now();
}

function pruneExpired() {
  const current = nowMs();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= current) {
      store.delete(key);
    }
  }
}

export function buildAnalyticsCacheKey(params: {
  businessId: string;
  branchId?: string | null;
  module: string;
  from: string;
  to: string;
  filters?: string;
}): string {
  const branch = params.branchId && params.branchId.trim().length > 0 ? params.branchId : 'ALL';
  const filters = params.filters && params.filters.trim().length > 0 ? params.filters : 'NONE';
  return `analytics:${params.businessId}:branch:${branch}:${params.module}:${params.from}:${params.to}:${filters}`;
}

export function getCachedAnalytics<T>(key: string): T | undefined {
  pruneExpired();
  const entry = store.get(key);
  if (!entry) {
    misses++;
    return undefined;
  }
  if (entry.expiresAt <= nowMs()) {
    store.delete(key);
    misses++;
    return undefined;
  }
  hits++;
  return entry.value as T;
}

export function setCachedAnalytics<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  if (store.size >= MAX_ENTRIES) {
    evictOldest();
  }
  store.set(key, { value, expiresAt: nowMs() + ttlMs });
}

function evictOldest(): void {
  let oldest: EvictionCandidate | null = null;
  for (const [key, entry] of store) {
    if (!oldest || entry.expiresAt < oldest.expiresAt) {
      oldest = { key, expiresAt: entry.expiresAt };
    }
  }
  if (oldest) {
    store.delete(oldest.key);
    evictions++;
  }
}

export function invalidateAnalyticsCache(params: {
  businessId: string;
  branchId?: string | null;
  module?: string | null;
}): number {
  const prefix = `analytics:${params.businessId}:`;
  let removed = 0;
  for (const key of store.keys()) {
    if (!key.startsWith(prefix)) continue;
    if (params.module && params.module.trim().length > 0) {
      const moduleSegment = key.split(':')[4];
      if (moduleSegment !== params.module) continue;
    }
    if (params.branchId && params.branchId.trim().length > 0) {
      const branchSegment = key.split(':')[3];
      if (branchSegment !== `branch:${params.branchId}`) continue;
    }
    store.delete(key);
    removed++;
  }
  return removed;
}

export async function withCachedAnalytics<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = getCachedAnalytics<T>(key);
  if (cached !== undefined) {
    return cached;
  }
  const value = await loader();
  setCachedAnalytics(key, value, ttlMs);
  return value;
}

export function getAnalyticsCacheStats(): AnalyticsCacheStats {
  pruneExpired();
  return {
    hits,
    misses,
    evictions,
    size: store.size,
  };
}

export function resetAnalyticsCacheStats(): void {
  hits = 0;
  misses = 0;
  evictions = 0;
}

export function clearAllAnalyticsCache(): number {
  const count = store.size;
  store.clear();
  return count;
}
