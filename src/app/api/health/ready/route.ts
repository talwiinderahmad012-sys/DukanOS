import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger, createCorrelationIdFromRequest } from '@/lib/logging';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = createCorrelationIdFromRequest(req);
  const timestamp = new Date().toISOString();
  let databaseOk = false;
  let prismaOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
    prismaOk = true;
  } catch (error) {
    logger.error('Readiness check failed', {
      correlationId: requestId,
      category: 'HEALTH',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const isReady = databaseOk && prismaOk;

  logger.info('Readiness check completed', {
    correlationId: requestId,
    category: 'HEALTH',
    status: isReady ? 'ready' : 'not_ready',
    database: databaseOk,
    prisma: prismaOk,
  });

  const responseBody = {
    status: isReady ? 'ready' : 'not_ready',
    database: databaseOk ? 'ok' : 'error',
    timestamp,
    checks: {
      database: databaseOk,
      prisma: prismaOk,
    },
  };

  return NextResponse.json(responseBody, {
    status: isReady ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Request-ID': requestId,
    },
  });
}
