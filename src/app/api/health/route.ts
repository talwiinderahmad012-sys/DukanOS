import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger, createCorrelationIdFromRequest } from '@/lib/logging';

export const dynamic = 'force-dynamic';

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

  const responseBody = {
    status: isHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: isHealthy ? latencyMs : undefined,
    },
  };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Request-ID': requestId,
    },
  });
}
