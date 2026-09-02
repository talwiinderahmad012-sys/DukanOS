import 'server-only';
import { prisma } from '@/lib/db/prisma';

/**
 * Safe database health check.
 *
 * Distinguishes DATABASE_AVAILABLE / DATABASE_UNAVAILABLE / DATABASE_TIMEOUT
 * WITHOUT ever exposing credentials, hostnames, or connection strings.
 * Used by QA scripts, diagnostics and graceful-degradation paths — never
 * throws, never logs raw driver errors (those may contain infra details).
 */
export type DatabaseHealthStatus =
  | 'DATABASE_AVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'DATABASE_TIMEOUT';

export type DatabaseHealth = {
  status: DatabaseHealthStatus;
  latencyMs: number | null;
};

const DEFAULT_TIMEOUT_MS = 5_000;

export async function checkDatabaseHealth(
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<DatabaseHealth> {
  const startedAt = Date.now();

  const probe = (async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      // Never surface the raw error here: driver/adapter errors can embed
      // hostnames or connection details. Callers only need the status.
      return false;
    }
  })();

  const timeout = new Promise<false>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
  });

  const ok = await Promise.race([probe, timeout]);
  const latencyMs = ok ? Date.now() - startedAt : null;

  if (!ok) {
    // Distinguish timeout from outright failure using elapsed time.
    const elapsed = Date.now() - startedAt;
    return {
      status: elapsed >= timeoutMs ? 'DATABASE_TIMEOUT' : 'DATABASE_UNAVAILABLE',
      latencyMs: null,
    };
  }

  return { status: 'DATABASE_AVAILABLE', latencyMs };
}
