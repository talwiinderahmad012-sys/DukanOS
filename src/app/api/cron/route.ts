import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkCameraHealth } from '@/services/cctv';
import { generateAdvisorFindings } from '@/services/advisor';
import { runScheduledReports } from '@/services/reports/scheduled';
import { logger, createCorrelationIdFromRequest } from '@/lib/logging';
import { authorizeCronRequest } from '@/lib/security/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // CRON_SECRET is required in every environment; a missing/invalid Bearer
  // token never reaches the maintenance logic (see authorizeCronRequest).
  const verdict = authorizeCronRequest(req);
  if (!verdict.authorized) {
    return NextResponse.json({ error: verdict.error }, { status: verdict.status });
  }
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const requestId = createCorrelationIdFromRequest(req);

  const results: Record<string, unknown> = {};
  const startTime = Date.now();

  try {
    const activeBusinesses = await prisma.business.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, timezone: true },
    });

    results.activeBusinessesCount = activeBusinesses.length;

    const activeCameras = await prisma.camera.findMany({
      where: { isEnabled: true, isArchived: false },
      select: { id: true, businessId: true },
    });

    let camerasChecked = 0;
    for (const camera of activeCameras) {
      try {
        await checkCameraHealth(camera.businessId, camera.id);
        camerasChecked++;
      } catch {
        logger.warn('Cron camera health check failed for camera', {
          correlationId: requestId,
          cameraId: camera.id,
          businessId: camera.businessId,
          category: 'CRON',
        });
      }
    }
    results.camerasChecked = camerasChecked;

    let advisorSweeps = 0;
    for (const business of activeBusinesses) {
      try {
        await generateAdvisorFindings(business.id, business.timezone);
        advisorSweeps++;
      } catch {
        logger.warn('Cron advisor sweep failed for business', {
          correlationId: requestId,
          businessId: business.id,
          category: 'CRON',
        });
      }
    }
    results.advisorSweeps = advisorSweeps;

    const scheduledReports = await runScheduledReports();
    results.scheduledReports = scheduledReports;

    const durationMs = Date.now() - startTime;
    results.durationMs = durationMs;

    logger.info('Scheduled maintenance cron completed successfully', {
      correlationId: requestId,
      category: 'CRON',
      durationMs,
      metadata: results,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      requestId,
    });
  } catch (error) {
    logger.error('Cron maintenance run encountered an error', {
      correlationId: requestId,
      category: 'CRON',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Cron maintenance job encountered an error.',
        requestId,
      },
      { status: 500 }
    );
  }
}
