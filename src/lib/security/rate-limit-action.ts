import 'server-only';
import { checkRateLimit, getRateLimitIdentifier } from './rate-limiter';
import { createError } from '@/lib/utils/api-response';
import { AppErrors } from '@/lib/utils/api-response';
import { AppError, ErrorCodes } from '@/lib/errors';

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

export async function enforceRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<void> {
  const config = RATE_LIMITS[action];
  const key = getRateLimitIdentifier([action, identifier]);
  const result = await checkRateLimit({ ...config, key });

  if (!result.allowed) {
    const retryAfter = Math.ceil(result.retryAfterMs / 1000);
    throw new AppError(
      ErrorCodes.RATE_LIMITED,
      `Too many requests. Retry after ${retryAfter} seconds.`,
      429
    );
  }
}

export function getClientIdentifier(
  userAgent?: string,
  forwardedFor?: string,
  fallback?: string
): string {
  const id = forwardedFor || userAgent || fallback || 'unknown';
  return id.slice(0, 256);
}
