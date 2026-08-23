import 'server-only';

import { prisma } from '@/lib/db/prisma';

export interface FunnelStage {
  stage: string;
  count: number;
  conversionFromPrevious: number; // percentage (0-100)
  dropoffRate: number; // percentage (0-100)
}

export interface ActivationFunnelResult {
  stages: FunnelStage[];
  totalSignups: number;
  totalActivated: number;
  activationRate: number;
}

export interface FeatureAdoptionItem {
  featureName: string;
  category: string;
  businessesUsing: number;
  totalBusinesses: number;
  adoptionRate: number;
}

export interface RetentionMetrics {
  totalBusinesses: number;
  activeLast1Day: number;
  activeLast7Days: number;
  activeLast30Days: number;
  day1RetentionRate: number;
  day7RetentionRate: number;
  day30RetentionRate: number;
}

export interface ReliabilityMetrics {
  totalCompletedSales: number;
  failedCheckouts: number;
  syncConflicts: number;
  reportFailures: number;
  commDeliveryFailures: number;
  cameraFailures: number;
  systemReliabilityRate: number; // e.g. 99.8%
}

export interface ProductHealthScoreResult {
  score: number; // 0 to 100
  rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
  breakdown: {
    activationScore: number; // max 30
    retentionScore: number; // max 25
    reliabilityScore: number; // max 25
    bugSeverityScore: number; // max 20
  };
  openCriticalBugs: number; // P0 + P1
}

/**
 * Calculates the product activation funnel from visitor signup to first successful POS sale.
 */
export async function getActivationFunnelMetrics(): Promise<ActivationFunnelResult> {
  const [
    totalSignups,
    totalBusinesses,
    businessesWithProducts,
    businessesWithPurchases,
    businessesWithSales,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.business.count(),
    prisma.product.groupBy({
      by: ['businessId'],
      _count: { id: true },
    }).then((res) => res.length),
    prisma.purchase.groupBy({
      by: ['businessId'],
      _count: { id: true },
    }).then((res) => res.length),
    prisma.sale.groupBy({
      by: ['businessId'],
      where: { status: 'COMPLETED' },
      _count: { id: true },
    }).then((res) => res.length),
  ]);

  const rawCounts = [
    { stage: 'User Signup', count: totalSignups },
    { stage: 'Business Profile Created', count: Math.min(totalSignups, totalBusinesses) },
    { stage: 'First Product Added', count: Math.min(totalBusinesses, businessesWithProducts) },
    { stage: 'First Stock Purchase', count: Math.min(businessesWithProducts, businessesWithPurchases) },
    { stage: 'First POS Sale (Activated)', count: Math.min(businessesWithPurchases, businessesWithSales) },
  ];

  const stages: FunnelStage[] = [];
  for (let i = 0; i < rawCounts.length; i++) {
    const current = rawCounts[i];
    const prev = i > 0 ? rawCounts[i - 1] : null;

    let conversion = 100;
    let dropoff = 0;

    if (prev && prev.count > 0) {
      conversion = Math.round((current.count / prev.count) * 1000) / 10;
      dropoff = Math.max(0, Math.round((100 - conversion) * 10) / 10);
    }

    stages.push({
      stage: current.stage,
      count: current.count,
      conversionFromPrevious: conversion,
      dropoffRate: dropoff,
    });
  }

  const activationRate = totalSignups > 0
    ? Math.round((businessesWithSales / totalSignups) * 1000) / 10
    : 0;

  return {
    stages,
    totalSignups,
    totalActivated: businessesWithSales,
    activationRate,
  };
}

/**
 * Calculates aggregate feature adoption across all active stores without exposing individual business data.
 */
export async function getFeatureAdoptionMetrics(): Promise<{
  totalBusinesses: number;
  features: FeatureAdoptionItem[];
}> {
  const totalBusinesses = await prisma.business.count();
  if (totalBusinesses === 0) {
    return { totalBusinesses: 0, features: [] };
  }

  const [
    productsCount,
    salesCount,
    creditCustomersCount,
    purchasesCount,
    employeesCount,
    camerasCount,
    feedbackCount,
    commConfigsCount,
    pwaEventsCount,
    offlineEventsCount,
  ] = await Promise.all([
    prisma.product.groupBy({ by: ['businessId'] }).then((r) => r.length),
    prisma.sale.groupBy({ by: ['businessId'], where: { status: 'COMPLETED' } }).then((r) => r.length),
    prisma.customer.groupBy({ by: ['businessId'], where: { outstanding: { gt: 0 } } }).then((r) => r.length),
    prisma.purchase.groupBy({ by: ['businessId'] }).then((r) => r.length),
    prisma.employee.groupBy({ by: ['businessId'], where: { status: 'ACTIVE' } }).then((r) => r.length),
    prisma.camera.groupBy({ by: ['businessId'], where: { isArchived: false } }).then((r) => r.length),
    prisma.customerFeedback.groupBy({ by: ['businessId'] }).then((r) => r.length),
    prisma.communicationProviderConfig.groupBy({ by: ['businessId'], where: { isEnabled: true } }).then((r) => r.length),
    prisma.productAnalyticsEvent.groupBy({ by: ['businessId'], where: { eventName: 'PWA_INSTALLED' } }).then((r) => r.length),
    prisma.productAnalyticsEvent.groupBy({ by: ['businessId'], where: { eventName: 'OFFLINE_MODE_USED' } }).then((r) => r.length),
  ]);

  const featureDefs = [
    { name: 'POS Counter Billing', category: 'Core Retail', count: salesCount },
    { name: 'Product Catalog & Inventory', category: 'Core Retail', count: productsCount },
    { name: 'Customer Udhaar (Credit Ledgers)', category: 'Finance', count: creditCustomersCount },
    { name: 'Wholesale Purchase Orders', category: 'Procurement', count: purchasesCount },
    { name: 'Staff Attendance & Payroll', category: 'Operations', count: employeesCount },
    { name: 'Offline POS Mode', category: 'Resilience', count: offlineEventsCount },
    { name: 'PWA Mobile App', category: 'Platform', count: pwaEventsCount },
    { name: 'Remote CCTV Foundation', category: 'Security', count: camerasCount },
    { name: 'Customer Feedback Portal', category: 'Customer Care', count: feedbackCount },
    { name: 'External Communication Gateway', category: 'Messaging', count: commConfigsCount },
  ];

  const features: FeatureAdoptionItem[] = featureDefs.map((f) => ({
    featureName: f.name,
    category: f.category,
    businessesUsing: f.count,
    totalBusinesses,
    adoptionRate: Math.round((f.count / totalBusinesses) * 1000) / 10,
  }));

  return { totalBusinesses, features };
}

/**
 * Calculates Day 1, Day 7, and Day 30 active business retention.
 */
export async function getUserRetentionMetrics(): Promise<RetentionMetrics> {
  const now = new Date();
  const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalBusinesses,
    activeD1,
    activeD7,
    activeD30,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.sale.groupBy({
      by: ['businessId'],
      where: { saleDate: { gte: d1 } },
    }).then((r) => r.length),
    prisma.sale.groupBy({
      by: ['businessId'],
      where: { saleDate: { gte: d7 } },
    }).then((r) => r.length),
    prisma.sale.groupBy({
      by: ['businessId'],
      where: { saleDate: { gte: d30 } },
    }).then((r) => r.length),
  ]);

  return {
    totalBusinesses,
    activeLast1Day: activeD1,
    activeLast7Days: activeD7,
    activeLast30Days: activeD30,
    day1RetentionRate: totalBusinesses > 0 ? Math.round((activeD1 / totalBusinesses) * 1000) / 10 : 0,
    day7RetentionRate: totalBusinesses > 0 ? Math.round((activeD7 / totalBusinesses) * 1000) / 10 : 0,
    day30RetentionRate: totalBusinesses > 0 ? Math.round((activeD30 / totalBusinesses) * 1000) / 10 : 0,
  };
}

/**
 * Calculates aggregate system reliability and failure metrics.
 */
export async function getReliabilityMetrics(): Promise<ReliabilityMetrics> {
  const [
    totalCompletedSales,
    failedCheckouts,
    syncConflicts,
    reportFailures,
    commFailures,
    cameraFailures,
  ] = await Promise.all([
    prisma.sale.count({ where: { status: 'COMPLETED' } }),
    prisma.productAnalyticsEvent.count({ where: { eventName: 'POS_CHECKOUT_FAILED' } }),
    prisma.productAnalyticsEvent.count({ where: { eventName: 'OFFLINE_SYNC_CONFLICT' } }),
    prisma.productAnalyticsEvent.count({ where: { eventName: 'REPORT_QUERY_FAILED' } }),
    prisma.productAnalyticsEvent.count({ where: { eventName: 'COMMUNICATION_DELIVERY_FAILED' } }),
    prisma.productAnalyticsEvent.count({ where: { eventName: 'CAMERA_CONNECTION_FAILED' } }),
  ]);

  const totalOps = totalCompletedSales + failedCheckouts;
  const systemReliabilityRate = totalOps > 0
    ? Math.round(((totalCompletedSales) / totalOps) * 1000) / 10
    : 100;

  return {
    totalCompletedSales,
    failedCheckouts,
    syncConflicts,
    reportFailures,
    commDeliveryFailures: commFailures,
    cameraFailures,
    systemReliabilityRate,
  };
}

/**
 * Computes a weighted, transparent Product Health Score (0-100).
 */
export async function getProductHealthScore(): Promise<ProductHealthScoreResult> {
  const [funnel, retention, reliability, openBugs] = await Promise.all([
    getActivationFunnelMetrics(),
    getUserRetentionMetrics(),
    getReliabilityMetrics(),
    prisma.bugReport.count({
      where: {
        severity: { in: ['P0', 'P1'] },
        status: { in: ['NEW', 'TRIAGED', 'IN_PROGRESS'] },
      },
    }),
  ]);

  // 1. Activation Weight: 30 points (max if activationRate >= 40%)
  const activationRatio = Math.min(1, funnel.activationRate / 40);
  const activationScore = Math.round(activationRatio * 30 * 10) / 10;

  // 2. Retention Weight: 25 points (max if 7-day retention >= 50%)
  const retentionRatio = Math.min(1, retention.day7RetentionRate / 50);
  const retentionScore = Math.round(retentionRatio * 25 * 10) / 10;

  // 3. Reliability Weight: 25 points (based on system uptime/success >= 98%)
  const reliabilityRatio = Math.max(0, (reliability.systemReliabilityRate - 90) / 10);
  const reliabilityScore = Math.round(Math.min(1, reliabilityRatio) * 25 * 10) / 10;

  // 4. Bug Severity Weight: 20 points (deduct 5 pts per open P0/P1 bug)
  const bugDeduction = openBugs * 5;
  const bugSeverityScore = Math.max(0, 20 - bugDeduction);

  const totalScore = Math.round(activationScore + retentionScore + reliabilityScore + bugSeverityScore);

  let rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' = 'GOOD';
  if (totalScore >= 80) rating = 'EXCELLENT';
  else if (totalScore < 60) rating = 'NEEDS_ATTENTION';

  return {
    score: totalScore,
    rating,
    breakdown: {
      activationScore,
      retentionScore,
      reliabilityScore,
      bugSeverityScore,
    },
    openCriticalBugs: openBugs,
  };
}
