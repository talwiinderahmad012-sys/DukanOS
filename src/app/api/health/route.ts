import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger, createCorrelationIdFromRequest } from '@/lib/logging';
import { timingSafeEqual, createHash } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Diagnostics (environment, version, uptime, DB latency) are only disclosed
 * to callers presenting the CRON_SECRET bearer token. Unauthenticated callers
 * receive a minimal liveness payload so the endpoint can still be used by
 * load-balancer probes without leaking environment details.
 */
function isAuthorizedForDiagnostics(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return false;
  try {
    const a = createHash('sha256').update(token).digest();
    const b = createHash('sha256').update(secret).digest();
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const requestId = createCorrelationIdFromRequest(req);
  const startTime = Date.now();
  let dbStatus = 'connected';
  let latencyMs = 0;

  try {
    const queryStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - queryStart;
  } catch (error) {
    dbStatus = 'disconnected';
    logger.error('Health check database query failed', {
      correlationId: requestId,
      category: 'HEALTH',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const isHealthy = dbStatus === 'connected';
  const durationMs = Date.now() - startTime;

  logger.info('Health check completed', {
    correlationId: requestId,
    category: 'HEALTH',
    status: isHealthy ? 'healthy' : 'degraded',
    databaseStatus: dbStatus,
    latencyMs: isHealthy ? latencyMs : undefined,
    durationMs,
  });

  const includeDiagnostics = isAuthorizedForDiagnostics(req);

  const responseBody = includeDiagnostics
    ? {
        status: isHealthy ? 'healthy' : 'degraded',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: dbStatus,
          latencyMs: isHealthy ? latencyMs : undefined,
        },
      }
    : {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
      };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Request-ID': requestId,
    },
  });
}
