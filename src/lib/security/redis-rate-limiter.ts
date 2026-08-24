import { RateLimitResult } from './rate-limiter.service';

export class RedisRateLimiter {
  private client: unknown;
  private ready: boolean = false;

  constructor(private readonly redisUrl: string) {
    try {
      // ioredis is an optional peer dependency: only required when
      // RATE_LIMIT_STRATEGY=redis is configured. Bundler-ignore markers keep
      // Next.js from failing/warning on the unresolved optional module; at
      // runtime a missing install throws here and FailClosedRateLimiter
      // converts every check into a denial (fail closed).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.client = require(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'ioredis')(redisUrl);
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    if (!this.ready || !this.client) {
      throw new Error('Redis rate limiter not available');
    }

    const now = Date.now();
    const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;

    const redis = this.client as {
      incr(key: string): Promise<number>;
      expire(key: string, seconds: number): Promise<void>;
      ttl(key: string): Promise<number>;
    };

    try {
      const count = await redis.incr(windowKey);
      if (count === 1) {
        await redis.expire(windowKey, Math.ceil(windowMs / 1000));
      }

      const ttl = await redis.ttl(windowKey);
      const resetAt = now + (ttl > 0 ? ttl * 1000 : windowMs);

      if (count > limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfterMs: Math.max(0, resetAt - now),
        };
      }

      return {
        allowed: true,
        remaining: limit - count,
        resetAt,
        retryAfterMs: 0,
      };
    } catch {
      throw new Error('Redis rate limit check failed');
    }
  }
}
