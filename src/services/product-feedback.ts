import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { 
  BugSeverity, 
  BugStatus, 
  ProductFeedbackType, 
  ProductFeedbackStatus 
} from '@/generated/prisma/client';
import { sanitizePlainText } from '@/lib/security/sanitizer';

/**
 * Creates a new user-reported bug report.
 */
export async function createBugReport(params: {
  reporterUserId: string;
  businessId?: string | null;
  module: string;
  title: string;
  description: string;
  severity?: BugSeverity;
}) {
  const sanitizedTitle = sanitizePlainText(params.title);
  const sanitizedDesc = sanitizePlainText(params.description);
  const severity = params.severity || BugSeverity.P2;

  const bug = await prisma.bugReport.create({
    data: {
      reporterUserId: params.reporterUserId,
      businessId: params.businessId || null,
      module: params.module.trim(),
      title: sanitizedTitle,
      description: sanitizedDesc,
      severity,
      status: BugStatus.NEW,
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true } },
    },
  });

  return bug;
}

/**
 * Triages and updates bug status, severity, and developer notes.
 */
export async function updateBugReportStatus(params: {
  bugId: string;
  status: BugStatus;
  developerNotes?: string | null;
  severity?: BugSeverity;
}) {
  const isResolved = params.status === BugStatus.RESOLVED || params.status === BugStatus.CLOSED;

  const updated = await prisma.bugReport.update({
    where: { id: params.bugId },
    data: {
      status: params.status,
      severity: params.severity,
      developerNotes: params.developerNotes ? sanitizePlainText(params.developerNotes) : undefined,
      resolvedAt: isResolved ? new Date() : null,
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true } },
    },
  });

  return updated;
}

/**
 * Submits platform satisfaction feedback or feature request with cooldown checking.
 */
export async function submitProductFeedback(params: {
  userId: string;
  businessId?: string | null;
  type: ProductFeedbackType;
  satisfaction?: string;
  category?: string;
  title?: string;
  message: string;
}) {
  // If satisfaction rating, check cooldown (max 1 per 30 days per user unless manual)
  if (params.type === ProductFeedbackType.SATISFACTION) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = await prisma.productFeedback.findFirst({
      where: {
        userId: params.userId,
        type: ProductFeedbackType.SATISFACTION,
        createdAt: { gte: thirtyDaysAgo },
      },
    });
    if (recent) {
      // Cooldown active, update the recent record instead of creating duplicates
      return prisma.productFeedback.update({
        where: { id: recent.id },
        data: {
          satisfaction: params.satisfaction || 'GREAT',
          message: sanitizePlainText(params.message),
        },
      });
    }
  }

  const feedback = await prisma.productFeedback.create({
    data: {
      userId: params.userId,
      businessId: params.businessId || null,
      type: params.type,
      satisfaction: params.satisfaction || null,
      category: params.category ? sanitizePlainText(params.category) : null,
      title: params.title ? sanitizePlainText(params.title) : null,
      message: sanitizePlainText(params.message),
      status: ProductFeedbackStatus.NEW,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true } },
    },
  });

  return feedback;
}

/**
 * Updates feature request triage status and admin notes.
 */
export async function updateProductFeedbackStatus(params: {
  feedbackId: string;
  status: ProductFeedbackStatus;
  adminNotes?: string | null;
}) {
  const updated = await prisma.productFeedback.update({
    where: { id: params.feedbackId },
    data: {
      status: params.status,
      adminNotes: params.adminNotes ? sanitizePlainText(params.adminNotes) : undefined,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true } },
    },
  });

  return updated;
}

/**
 * Summarizes product feedback and bug queue metrics.
 */
export async function getProductFeedbackOverview() {
  const [
    totalBugs,
    openBugs,
    p0Bugs,
    p1Bugs,
    resolvedBugs,
    feedbacks,
  ] = await Promise.all([
    prisma.bugReport.count(),
    prisma.bugReport.count({ where: { status: { in: ['NEW', 'TRIAGED', 'IN_PROGRESS'] } } }),
    prisma.bugReport.count({ where: { severity: 'P0', status: { notIn: ['RESOLVED', 'CLOSED', 'WONT_FIX'] } } }),
    prisma.bugReport.count({ where: { severity: 'P1', status: { notIn: ['RESOLVED', 'CLOSED', 'WONT_FIX'] } } }),
    prisma.bugReport.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
    prisma.productFeedback.findMany({
      select: { type: true, satisfaction: true, status: true },
    }),
  ]);

  let greatCount = 0;
  let okayCount = 0;
  let needsImprovementCount = 0;
  let featureRequestsCount = 0;
  let plannedFeaturesCount = 0;
  let shippedFeaturesCount = 0;

  for (const f of feedbacks) {
    if (f.type === 'SATISFACTION') {
      if (f.satisfaction === 'GREAT') greatCount++;
      else if (f.satisfaction === 'OKAY') okayCount++;
      else if (f.satisfaction === 'NEEDS_IMPROVEMENT') needsImprovementCount++;
    } else if (f.type === 'FEATURE_REQUEST' || f.type === 'SUGGESTION') {
      featureRequestsCount++;
      if (f.status === 'PLANNED' || f.status === 'IN_DEVELOPMENT') plannedFeaturesCount++;
      if (f.status === 'SHIPPED') shippedFeaturesCount++;
    }
  }

  return {
    bugs: {
      total: totalBugs,
      open: openBugs,
      p0: p0Bugs,
      p1: p1Bugs,
      resolved: resolvedBugs,
    },
    satisfaction: {
      great: greatCount,
      okay: okayCount,
      needsImprovement: needsImprovementCount,
      total: greatCount + okayCount + needsImprovementCount,
    },
    featureRequests: {
      total: featureRequestsCount,
      planned: plannedFeaturesCount,
      shipped: shippedFeaturesCount,
    },
  };
}

/**
 * Lists bug reports with optional filtering.
 */
export async function listBugReports(filter?: {
  status?: BugStatus;
  severity?: BugSeverity;
}) {
  return prisma.bugReport.findMany({
    where: {
      status: filter?.status,
      severity: filter?.severity,
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true } },
    },
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  });
}

/**
 * Lists product feedback and feature requests with optional filtering.
 */
export async function listProductFeedbacks(filter?: {
  type?: ProductFeedbackType;
  status?: ProductFeedbackStatus;
}) {
  return prisma.productFeedback.findMany({
    where: {
      type: filter?.type,
      status: filter?.status,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
