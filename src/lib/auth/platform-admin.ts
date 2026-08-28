import 'server-only';
import { requireAuthenticatedUser } from './context';
import { AppError, ErrorCodes } from '@/lib/errors';
import { normalizeEmail } from './email';

/**
 * Platform-admin authorization boundary.
 *
 * Platform-wide data (cross-tenant bug/feature triage, product analytics
 * aggregated over every business) must never be served to ordinary tenant
 * OWNER/MANAGER users. Platform administrators are identified exclusively by
 * an environment allowlist (PLATFORM_ADMIN_EMAILS, comma-separated). The list
 * never lives in source control and this module is the only place that
 * resolves it.
 */

function getPlatformAdminEmails(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((entry) => normalizeEmail(entry))
      .filter(Boolean)
  );
}

/** Check whether an email address is a configured platform administrator. */
export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().has(normalizeEmail(email));
}

/**
 * Require the currently authenticated user to be a platform administrator.
 * Throws a 403 AppError otherwise. Use for every platform-wide read or
 * triage mutation (server pages AND server actions).
 */
export async function requirePlatformAdmin() {
  const user = await requireAuthenticatedUser();
  if (!isPlatformAdminEmail(user.email)) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      'Platform administrator access required.',
      403
    );
  }
  return user;
}

/** Non-throwing variant for UI decisions (never a substitute for the guard). */
export async function checkIsPlatformAdmin(): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser();
    return isPlatformAdminEmail(user.email);
  } catch {
    return false;
  }
}
