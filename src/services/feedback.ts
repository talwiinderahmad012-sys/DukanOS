import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { FeedbackCategory, FeedbackStatus, NotificationSeverity } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import crypto from 'crypto';

export async function generateFeedbackInviteToken(
  businessId: string,
  options: {
    customerId?: string | null;
    saleId?: string | null;
    expiresInDays?: number;
  } = {}
) {
  const token = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  const days = options.expiresInDays || 30;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const invite = await prisma.feedbackInviteToken.create({
    data: {
      businessId,
      customerId: options.customerId || null,
      saleId: options.saleId || null,
      token,
      expiresAt,
    },
  });

  return invite;
}

export async function verifyFeedbackToken(tokenString: string) {
  const token = await prisma.feedbackInviteToken.findUnique({
    where: { token: tokenString.trim() },
    include: {
      business: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      sale: { select: { id: true, invoiceNumber: true, saleDate: true } },
    },
  });

  if (!token) {
    return { valid: false, reason: 'INVALID', message: 'This feedback link is invalid.' };
  }

  if (token.usedAt) {
    return { valid: false, reason: 'ALREADY_USED', message: 'This feedback invitation has already been submitted. Thank you!' };
  }

  if (token.expiresAt < new Date()) {
    return { valid: false, reason: 'EXPIRED', message: 'This feedback link has expired.' };
  }

  return {
    valid: true,
    token: token.token,
    business: token.business,
    customer: token.customer,
    sale: token.sale,
  };
}

export async function submitCustomerFeedback(
  tokenString: string,
  data: {
    rating: number;
    category?: FeedbackCategory;
    message: string;
    isAnonymous?: boolean;
  }
) {
  const verification = await verifyFeedbackToken(tokenString);
  if (!verification.valid || !verification.business) {
    throw new Error(verification.message || 'Invalid or expired feedback link');
  }

  const rating = Math.min(5, Math.max(1, Math.round(data.rating)));
  const category = data.category || FeedbackCategory.SERVICE;
  const isAnonymous = Boolean(data.isAnonymous);

  const feedback = await prisma.$transaction(async (tx) => {
    // 1. Mark token as used
    await tx.feedbackInviteToken.update({
      where: { token: tokenString.trim() },
      data: { usedAt: new Date() },
    });

    // 2. Create customer feedback record
    const record = await tx.customerFeedback.create({
      data: {
        businessId: verification.business!.id,
        customerId: isAnonymous ? null : (verification.customer?.id || null),
        saleId: verification.sale?.id || null,
        token: tokenString.trim(),
        rating,
        category,
        message: data.message.trim(),
        isAnonymous,
        status: FeedbackStatus.NEW,
      },
    });

    return record;
  });

  // 3. Low Rating Alert Notification (Rating <= 2)
  if (rating <= 2) {
    const customerIdentifier = isAnonymous
      ? 'An anonymous customer'
      : (verification.customer?.name || 'A customer');

    await prisma.notification.create({
      data: {
        businessId: verification.business.id,
        type: 'CUSTOMER_FEEDBACK',
        severity: rating === 1 ? NotificationSeverity.ALERT : NotificationSeverity.WARNING,
        title: `Low Customer Rating Alert (${rating}★)`,
        message: `${customerIdentifier} submitted a ${rating}-star review for ${category.toLowerCase()}: "${data.message.trim()}".`,
        isOwnerOnly: false,
        relatedEntity: 'FEEDBACK',
        relatedEntityId: feedback.id,
        deduplicationKey: `${verification.business.id}-FEEDBACK-${feedback.id}`,
      },
    });
  }

  return {
    feedback,
    businessName: verification.business.name,
  };
}

export async function getFeedbackDashboardStats(businessId: string) {
  const feedbacks = await prisma.customerFeedback.findMany({
    where: { businessId },
    select: { rating: true, category: true, status: true, createdAt: true },
  });

  const totalReviews = feedbacks.length;
  const sumRating = feedbacks.reduce((acc, f) => acc + f.rating, 0);
  const averageRating = totalReviews > 0 ? Math.round((sumRating / totalReviews) * 10) / 10 : null;

  const positiveCount = feedbacks.filter((f) => f.rating >= 4).length;
  const neutralCount = feedbacks.filter((f) => f.rating === 3).length;
  const negativeCount = feedbacks.filter((f) => f.rating <= 2).length;

  const newCount = feedbacks.filter((f) => f.status === 'NEW').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'RESOLVED').length;

  // Category breakdown
  const categoryMap: Record<string, { total: number; sum: number }> = {};
  for (const f of feedbacks) {
    const cat = f.category;
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, sum: 0 };
    categoryMap[cat].total += 1;
    categoryMap[cat].sum += f.rating;
  }

  const categories = Object.entries(categoryMap).map(([category, stats]) => ({
    category,
    count: stats.total,
    averageRating: Math.round((stats.sum / stats.total) * 10) / 10,
  }));

  return {
    totalReviews,
    averageRating,
    positiveCount,
    neutralCount,
    negativeCount,
    newCount,
    resolvedCount,
    categories,
  };
}

export async function listBusinessFeedback(
  businessId: string,
  options: {
    search?: string;
    status?: FeedbackStatus | 'ALL';
    category?: FeedbackCategory | 'ALL';
    rating?: number;
    customerId?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { businessId };

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options.category && options.category !== 'ALL') {
    where.category = options.category;
  }

  if (options.rating && options.rating >= 1 && options.rating <= 5) {
    where.rating = options.rating;
  }

  if (options.customerId) {
    where.customerId = options.customerId;
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    where.OR = [
      { message: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [feedbacks, totalCount] = await Promise.all([
    prisma.customerFeedback.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        sale: { select: { id: true, invoiceNumber: true, saleDate: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.customerFeedback.count({ where }),
  ]);

  return {
    feedbacks,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

export async function resolveFeedback(
  businessId: string,
  userId: string,
  feedbackId: string,
  status: FeedbackStatus,
  resolutionNote?: string | null
) {
  const feedback = await prisma.customerFeedback.findFirst({
    where: { id: feedbackId, businessId },
  });

  if (!feedback) {
    throw new Error('Feedback record not found or unauthorized.');
  }

  const updated = await prisma.customerFeedback.update({
    where: { id: feedbackId },
    data: {
      status,
      resolutionNote: resolutionNote?.trim() || null,
      resolvedBy: userId,
      resolvedAt: status === FeedbackStatus.RESOLVED ? new Date() : null,
    },
    include: {
      customer: { select: { id: true, name: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: `FEEDBACK_${status}`,
    entityType: 'CustomerFeedback',
    entityId: feedback.id,
    metadata: {
      rating: feedback.rating,
      category: feedback.category,
      status,
      resolutionNote: resolutionNote || null,
    },
  });

  return updated;
}
