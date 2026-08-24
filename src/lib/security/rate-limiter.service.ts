/**
 * Central rate-limiter provider architecture.
 *
 * This is the ONLY rate-limit engine in DukaanOS. Facades
 * (`rate-limiter.ts`, `rate-limit-action.ts`) delegate here; they must not
 * maintain their own stores.
 *
 * Production strategy:
 * - RATE_LIMIT_STRATEGY=redis (+ REDIS_URL)  -> shared Redis-backed provider,
 *   wrapped in FailClosedRateLimiter. If the Redis backend cannot be loaded or
 *   errors at runtime, checks DENY (fail closed) instead of silently degrading.
 * - RATE_LIMIT_STRATEGY=memory or default    -> bounded in-memory fallback
 *   wrapped in FailClosedRateLimiter (errors deny).
 *
 * If a distributed strategy is explicitly requested but unavailable in
 * production, the resolver fails CLOSED (deny-all) so the local fallback can
 * never accidentally become the production strategy.
 *
 * The in-memory fallback is bounded: TTL expiration, periodic lazy cleanup and
 * deterministic FIFO eviction when the entry cap is reached. It uses no timers,
 * so it never keeps a serverless/Next.js process alive.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

export interface RateLimiterProvider {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

const DEFAULT_MAX_ENTRIES = 10_000;
/** Lazy cleanup cadence: sweep expired entries every N check operations. */
const CLEANUP_INTERVAL_OPS = 128;

type MemoryEntry = { count: number; resetAt: number };

/**
 * Bounded fixed-window in-memory rate limiter.
 * - Entries expire after their window (TTL).
 * - Expired entries are swept lazily during `check` (no timers).
 * - When the store reaches `maxEntries`: expired entries are evicted first,
 *   then the oldest-inserted entries (Map insertion order = FIFO), giving
 *   deterministic eviction with no unbounded growth.
 */
export class InMemoryRateLimiter implements RateLimiterProvider {
  private store = new Map<string, MemoryEntry>();
  private opsSinceSweep = 0;

  constructor(private readonly maxEntries: number = DEFAULT_MAX_ENTRIES) {
    if (!Number.isFinite(maxEntries) || maxEntries < 1) {
      throw new Error('InMemoryRateLimiter maxEntries must be a positive finite number');
    }
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.maybeCleanup(now);

    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.ensureCapacity(now);
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
        retryAfterMs: 0,
      };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfterMs: Math.max(0, entry.resetAt - now),
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
      retryAfterMs: 0,
    };
  }

  /** Remove one key (used by facades' reset helpers). */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Clear every key (used by facades/tests). */
  clear(): void {
    this.store.clear();
    this.opsSinceSweep = 0;
  }

  get size(): number {
    return this.store.size;
  }

  /**
   * Make room for one incoming entry before insertion:
   * 1) evict already-expired entries, then
   * 2) if still at capacity, evict oldest-inserted entries (FIFO).
   */
  private ensureCapacity(now: number): void {
    if (this.store.size < this.maxEntries) return;

    for (const [key, value] of this.store) {
      if (this.store.size < this.maxEntries) break;
      if (now >= value.resetAt) this.store.delete(key);
    }

    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  /** Timer-free periodic sweep of expired entries. */
  private maybeCleanup(now: number): void {
    this.opsSinceSweep += 1;
    if (this.opsSinceSweep < CLEANUP_INTERVAL_OPS) return;
    this.opsSinceSweep = 0;

    for (const [key, value] of this.store) {
      if (now >= value.resetAt) this.store.delete(key);
    }
  }
}

/**
 * Denies every check when no delegate is configured, and converts delegate
 * failures into denials. Used for security-sensitive limits that must fail
 * closed rather than open.
 */
export class FailClosedRateLimiter implements RateLimiterProvider {
  constructor(private readonly delegate: RateLimiterProvider | null) {}

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    if (!this.delegate) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + windowMs,
        retryAfterMs: windowMs,
      };
    }
    try {
      return await this.delegate.check(key, limit, windowMs);
    } catch {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + windowMs,
        retryAfterMs: windowMs,
      };
    }
  }
}

export type RateLimiterStrategy = 'memory' | 'redis';

export interface RateLimiterEnvConfig {
  nodeEnv?: string;
  strategy?: string | null;
  redisUrl?: string | null;
}

/**
 * Pure provider resolution from environment-like config. Exported for tests;
 * production code goes through `getRateLimiterProvider()`.
 *
 * Resolution rules:
 * - strategy 'redis': requires redisUrl AND a loadable Redis backend.
 *   Unavailable in production -> FailClosedRateLimiter(null) (deny-all).
 *   Unavailable outside production -> explicit bounded memory fallback (warned).
 * - otherwise: FailClosedRateLimiter(new InMemoryRateLimiter()).
 */
export function resolveRateLimiterProvider(config: RateLimiterEnvConfig = {}): RateLimiterProvider {
  activeMemoryInstance = null;
  const nodeEnv = config.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const rawStrategy = (config.strategy ?? process.env.RATE_LIMIT_STRATEGY ?? 'memory').toLowerCase();
  const strategy: RateLimiterStrategy = rawStrategy === 'redis' ? 'redis' : 'memory';
  const redisUrl = config.redisUrl !== undefined ? config.redisUrl : process.env.REDIS_URL || null;

  if (strategy === 'redis') {
    if (redisUrl) {
      // RedisRateLimiter itself swallows constructor failures and surfaces them
      // via check(); wrapping it in FailClosedRateLimiter turns those into
      // denials (fail closed) instead of silent bypasses.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { RedisRateLimiter } = require('./redis-rate-limiter') as {
          RedisRateLimiter: new (url: string) => RateLimiterProvider;
        };
        return new FailClosedRateLimiter(new RedisRateLimiter(redisUrl));
      } catch {
        console.warn(
          '[RateLimiter] RATE_LIMIT_STRATEGY=redis requested but the Redis backend could not be loaded.' +
            (isProduction
              ? ' Failing CLOSED: security-sensitive rate limits will deny requests until Redis is available.'
              : ' Falling back to the bounded local memory limiter (non-production only).')
        );
      }
    } else {
      console.warn(
        '[RateLimiter] RATE_LIMIT_STRATEGY=redis requested but REDIS_URL is not set.' +
          (isProduction
            ? ' Failing CLOSED: security-sensitive rate limits will deny requests until Redis is configured.'
            : ' Falling back to the bounded local memory limiter (non-production only).')
      );
    }

    if (isProduction) {
      return new FailClosedRateLimiter(null);
    }
  }

  const memory = new InMemoryRateLimiter();
  activeMemoryInstance = memory;
  return new FailClosedRateLimiter(memory);
}

let providerInstance: RateLimiterProvider | null = null;
let activeMemoryInstance: InMemoryRateLimiter | null = null;

export async function getRateLimiterProvider(): Promise<RateLimiterProvider> {
  if (providerInstance) return providerInstance;
  providerInstance = resolveRateLimiterProvider();
  return providerInstance;
}

/** The live bounded-memory instance when the active provider is memory-backed, else null. */
export function getActiveMemoryStore(): InMemoryRateLimiter | null {
  return activeMemoryInstance;
}

/** Test-only hook: forget the cached provider so the next check re-resolves from env. */
export function __resetRateLimiterProviderForTests(): void {
  providerInstance = null;
  activeMemoryInstance = null;
}
