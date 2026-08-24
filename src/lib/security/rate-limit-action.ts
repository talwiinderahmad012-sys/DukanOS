import { AppError, ErrorCodes } from '@/lib/errors';
import {
  getRateLimiterProvider,
  getActiveMemoryStore,
  RateLimitResult,
} from './rate-limiter.service';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  key?: string;
}

export interface RateLimitResultWithKey extends RateLimitResult {
  key: string;
}

/**
 * Check a rate limit through the central rate-limiter provider abstraction
 * (`rate-limiter.service.ts`). This module owns no store of its own.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResultWithKey> {
  const { limit, windowMs, key = 'global' } = options;
  const provider = await getRateLimiterProvider();
  const result = await provider.check(key, limit, windowMs);
  return { ...result, key };
}

export function getRateLimitIdentifier(parts: string[]): string {
  return parts.join('|');
}

/** Reset one key in the active memory-backed store (no-op for remote providers). */
export function resetRateLimit(key: string): void {
  getActiveMemoryStore()?.delete(key);
}

/** Clear the active memory-backed store (used by tests; no-op for remote providers). */
export function clearAllRateLimits(): void {
  getActiveMemoryStore()?.clear();
}

export const RATE_LIMITS = {
  LOGIN: { limit: 5, windowMs: 60_000 },
  REGISTER: { limit: 3, windowMs: 60_000 },
  PASSWORD_RESET: { limit: 3, windowMs: 60_000 },
  POS_CHECKOUT: { limit: 10, windowMs: 60_000 },
  CUSTOMER_PAYMENT: { limit: 20, windowMs: 60_000 },
  COMMUNICATION_SEND: { limit: 30, windowMs: 60_000 },
  CCTV_CONTROL: { limit: 10, windowMs: 60_000 },
  PUBLIC_FEEDBACK: { limit: 5, windowMs: 60_000 },
  API_GENERAL: { limit: 100, windowMs: 60_000 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Enforce a security-sensitive rate limit. Denials are raised as a structured
 * AppError (code RATE_LIMITED, HTTP 429) so callers can branch on
 * `error instanceof AppError` / `error.code` without string parsing. The error
 * carries only safe metadata (action + retry hint) — never identifiers or secrets.
 */
export async function enforceRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<void> {
  const config = RATE_LIMITS[action];
  const key = getRateLimitIdentifier([action, identifier]);
  const result = await checkRateLimit({ ...config, key });

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
    throw new AppError(
      ErrorCodes.RATE_LIMITED,
      'Too many requests. Please try again later.',
      429,
      {
        action,
        retryAfterSeconds,
      }
    );
  }
}
