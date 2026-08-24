import 'server-only';

/**
 * Server-only facade over the central rate-limiter provider architecture
 * (`rate-limiter.service.ts`). Kept as a stable import surface for existing
 * callers; the engine and store live exclusively in the service module.
 */

export {
  checkRateLimit,
  getRateLimitIdentifier,
  resetRateLimit,
  clearAllRateLimits,
} from './rate-limit-action';

export type {
  RateLimitOptions,
  RateLimitResultWithKey,
} from './rate-limit-action';
export type { RateLimitResult } from './rate-limiter.service';
