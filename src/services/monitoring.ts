import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './audit';

export async function getRemoteBusinessStatus(businessId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    business,
    todaySales,
    todayProfit,
    activeEmployeesCount,
    todayAttendances,
    lowStockProducts,
    overdueCustomersCount,
    pendingLeavesCount,
    openComplaintsCount,
    newLowFeedbacksCount,
    activeCameras,
  ] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, isOpen: true, operatingHours: true, timezone: true },
    }),
    prisma.sale.aggregate({
      where: {
        businessId,
        status: 'COMPLETED',
        saleDate: { gte: todayStart },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId,
          status: 'COMPLETED',
          saleDate: { gte: todayStart },
        },
      },
      _sum: { lineProfit: true },
    }),
    prisma.employee.count({
      where: { businessId, status: 'ACTIVE' },
    }),
    prisma.employeeAttendance.findMany({
      where: {
        businessId,
        date: { gte: todayStart },
      },
      select: { status: true },
    }),
    prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
      },
      select: { id: true, name: true, currentStock: true, minStockThreshold: true },
    }),
    prisma.customer.count({
      where: { businessId, isActive: true, outstanding: { gt: 0 } },
    }),
    prisma.employeeLeave.count({
      where: { businessId, status: 'PENDING' },
    }),
    prisma.employeeComplaint.count({
      where: { businessId, status: { in: ['OPEN', 'IN_REVIEW'] } },
    }),
    prisma.customerFeedback.count({
      where: { businessId, rating: { lte: 2 }, status: 'NEW' },
    }),
    prisma.camera.findMany({
      where: { businessId, isArchived: false, isEnabled: true },
      select: {
        id: true,
        name: true,
        location: true,
        branchId: true,
        status: true,
        lastCheckedAt: true,
        lastOnlineAt: true,
      },
    }),
  ]);

  if (!business) {
    throw new Error('Business not found');
  }

  // Attendance breakdown
  const presentCount = todayAttendances.filter((a) => a.status === 'PRESENT').length;
  const lateCount = todayAttendances.filter((a) => a.status === 'LATE').length;
  const absentCount = todayAttendances.filter((a) => a.status === 'ABSENT').length;
  const leaveCount = todayAttendances.filter((a) => a.status === 'LEAVE').length;
  const markedTotal = todayAttendances.length;
  const unmarkedCount = Math.max(0, activeEmployeesCount - markedTotal);

  // Low stock breakdown
  const lowStockItems = lowStockProducts.filter(
    (p) => p.currentStock <= p.minStockThreshold
  );

  // CCTV availability breakdown (enabled, non-archived cameras only)
  const camerasOnline = activeCameras.filter((c) => c.status === 'ONLINE').length;
  const camerasOffline = activeCameras.filter((c) => c.status === 'OFFLINE').length;
  const camerasDegraded = activeCameras.filter((c) => c.status === 'DEGRADED').length;
  const offlineCameraHighlights = activeCameras
    .filter((c) => c.status === 'OFFLINE' || c.status === 'DEGRADED')
    .map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      branchId: c.branchId,
      status: c.status,
      lastOnlineAt: c.lastOnlineAt ? c.lastOnlineAt.toISOString() : null,
    }));

  return {
    business: {
      id: business.id,
      name: business.name,
      isOpen: business.isOpen,
      operatingHours: business.operatingHours,
      timezone: business.timezone,
    },
    liveSales: {
      totalSales: Number(todaySales._sum.total || 0),
      orderCount: todaySales._count.id,
      grossProfit: Number(todayProfit._sum.lineProfit || 0),
    },
    attendance: {
      totalEmployees: activeEmployeesCount,
      presentCount,
      lateCount,
      absentCount,
      leaveCount,
      unmarkedCount,
    },
    cameras: {
      total: activeCameras.length,
      online: camerasOnline,
      offline: camerasOffline,
      degraded: camerasDegraded,
      offlineHighlights: offlineCameraHighlights,
    },
    actionCenter: {
      lowStockCount: lowStockItems.length,
      overdueCustomersCount,
      pendingLeavesCount,
      openComplaintsCount,
      newLowFeedbacksCount,
      offlineCamerasCount: camerasOffline + camerasDegraded,
      totalActionableIssues:
        lowStockItems.length +
        (overdueCustomersCount > 0 ? 1 : 0) +
        pendingLeavesCount +
        openComplaintsCount +
        newLowFeedbacksCount +
        (camerasOffline + camerasDegraded > 0 ? 1 : 0),
    },
  };
}

export async function updateBusinessOpenStatus(
  businessId: string,
  userId: string,
  isOpen: boolean,
  operatingHours?: string | null
) {
  const updated = await prisma.business.update({
    where: { id: businessId },
    data: {
      isOpen,
      ...(operatingHours !== undefined && { operatingHours: operatingHours?.trim() || null }),
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'BUSINESS_STATUS_UPDATED',
    entityType: 'Business',
    entityId: businessId,
    metadata: { isOpen, operatingHours },
  });

  return updated;
}
