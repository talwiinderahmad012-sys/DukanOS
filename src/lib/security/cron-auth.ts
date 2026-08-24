import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logging';

export type CronAuthorizationResult =
  | { authorized: true }
  | { authorized: false; status: number; error: string };

/**
 * Constant-time token comparison. Both sides are hashed first so the
 * comparison never leaks token length or content through timing.
 */
function tokensMatch(provided: string, secret: string): boolean {
  const providedHash = createHash('sha256').update(provided, 'utf8').digest();
  const secretHash = createHash('sha256').update(secret, 'utf8').digest();
  return timingSafeEqual(providedHash, secretHash);
}

/**
 * Authorize a protected cron request.
 *
 * CRON_SECRET is REQUIRED in every environment. A missing configuration never
 * results in an unauthenticated successful run — it fails deterministically
 * with 500 and a safe error body. A missing/malformed/incorrect Authorization
 * Bearer token always yields 401 with a generic message. Secret values are
 * never logged or included in responses.
 */
export function authorizeCronRequest(req: Request): CronAuthorizationResult {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.length === 0) {
    logger.error('CRON_SECRET is not configured; refusing cron execution', {
      category: 'CRON',
    });
    return { authorized: false, status: 500, error: 'Service configuration error.' };
  }

  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const bearerToken = match?.[1] ?? '';

  if (!bearerToken || !tokensMatch(bearerToken, cronSecret)) {
    logger.warn('Cron unauthorized access attempt', {
      category: 'CRON',
      hasAuthorizationHeader: header.length > 0,
    });
    return { authorized: false, status: 401, error: 'Unauthorized' };
  }

  return { authorized: true };
}
