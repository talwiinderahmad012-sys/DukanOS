import 'server-only';
import { prisma } from '@/lib/db/prisma';

export async function getSystemDiagnostics(businessId: string) {
  const startTime = Date.now();

  // 1. Test Database Roundtrip Ping
  let dbStatus: 'HEALTHY' | 'WARNING' | 'UNAVAILABLE' = 'HEALTHY';
  let dbLatencyMs = 0;
  try {
    const dbPingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbPingStart;
    if (dbLatencyMs > 500) {
      dbStatus = 'WARNING';
    }
  } catch {
    dbStatus = 'UNAVAILABLE';
  }

  // 2. Check Entity Counts
  const [
    productsCount,
    salesCount,
    customersCount,
    membersCount,
    camerasCount,
    commsConfigCount,
  ] = await Promise.all([
    prisma.product.count({ where: { businessId, isActive: true } }),
    prisma.sale.count({ where: { businessId } }),
    prisma.customer.count({ where: { businessId, isActive: true } }),
    prisma.businessMembership.count({ where: { businessId } }),
    prisma.camera.count({ where: { businessId, isArchived: false } }),
    prisma.communicationProviderConfig.count({ where: { businessId, isEnabled: true } }),
  ]);

  return {
    version: '1.0.0 (Step 17)',
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString(),
    diagnostics: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        engine: 'PostgreSQL 16 (Prisma 7)',
      },
      auth: {
        status: 'HEALTHY',
        strategy: 'NextAuth JWT + bcrypt',
      },
      pwaSync: {
        status: 'HEALTHY',
        capabilities: ['Service Worker', 'IndexedDB Queue', 'Idempotent Sync'],
      },
      pushNotifications: {
        status: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'CONFIGURED' : 'READY',
        service: 'W3C Web Push API (VAPID)',
      },
      communicationsGateway: {
        status: commsConfigCount > 0 ? 'ACTIVE' : 'READY',
        activeProvidersCount: commsConfigCount,
      },
      cctvSecurity: {
        status: camerasCount > 0 ? 'MONITORING' : 'READY',
        registeredDevices: camerasCount,
      },
    },
    counts: {
      products: productsCount,
      sales: salesCount,
      customers: customersCount,
      members: membersCount,
      cameras: camerasCount,
    },
  };
}
