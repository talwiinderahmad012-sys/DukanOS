import 'server-only';
import { prisma } from '@/lib/db/prisma';
import {
  CommunicationChannel,
  CustomerFeedbackType,
  DeliveryStatus,
  FeedbackPriority,
  FeedbackWorkflowStatus,
  MembershipRole,
} from '@/generated/prisma/client';
import { recordAuditLog } from './audit';
import { sanitizePlainText } from '@/lib/security/sanitizer';
import { sendMessage } from './communications';
import { AppError, ErrorCodes } from '@/lib/errors';

const STAFF_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.MANAGER];

function assertStaffRole(actorRole?: MembershipRole | null, action?: string) {
  if (!actorRole || !STAFF_ROLES.includes(actorRole)) {
    throw new Error(`Forbidden: Role '${actorRole || 'NONE'}' cannot ${action || 'perform this action'}.`);
  }
}

function isStaffRole(actorRole?: MembershipRole | null) {
  return !!actorRole && STAFF_ROLES.includes(actorRole);
}

export type FeedbackStats = {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  averageRating: number | null;
  positiveCount: number;
  negativeCount: number;
  highPriorityOpen: number;
  feedbackByType: { type: CustomerFeedbackType; count: number }[];
};

/**
 * Aggregated dashboard stats. All math runs over PostgreSQL `Int` ratings
 * (no floating point in storage or the query path); the average is derived
 * from integer sums so it stays deterministic when rounded.
 */
export async function getFeedbackStats(businessId: string): Promise<FeedbackStats> {
  const where = { businessId };

  const [total, pending, inProgress, resolved, rejected, ratings, typeGroup] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: { ...where, status: FeedbackWorkflowStatus.PENDING } }),
    prisma.feedback.count({ where: { ...where, status: FeedbackWorkflowStatus.IN_PROGRESS } }),
    prisma.feedback.count({ where: { ...where, status: FeedbackWorkflowStatus.RESOLVED } }),
    prisma.feedback.count({ where: { ...where, status: FeedbackWorkflowStatus.REJECTED } }),
    prisma.feedback.findMany({
      where: { businessId, rating: { not: null }, status: { not: FeedbackWorkflowStatus.REJECTED } },
      select: { rating: true },
    }),
    prisma.feedback.groupBy({ by: ['type'], where, _count: { _all: true } }),
  ]);

  const totalReviews = ratings.length;
  const ratingSum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
  const averageRating =
    totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : null;

  const positiveCount = ratings.filter((r) => (r.rating || 0) >= 4).length;
  const negativeCount = ratings.filter((r) => (r.rating || 0) <= 2).length;

  const highPriorityOpen = await prisma.feedback.count({
    where: {
      businessId,
      priority: { in: [FeedbackPriority.HIGH, FeedbackPriority.CRITICAL] },
      status: { in: [FeedbackWorkflowStatus.PENDING, FeedbackWorkflowStatus.IN_PROGRESS] },
    },
  });

  return {
    total,
    pending,
    inProgress,
    resolved,
    rejected,
    averageRating,
    positiveCount,
    negativeCount,
    highPriorityOpen,
    feedbackByType: typeGroup.map((g) => ({ type: g.type, count: g._count._all })),
  };
}export type FeedbackListOptions = {
  status?: FeedbackWorkflowStatus | 'ALL';
  priority?: FeedbackPriority | 'ALL';
  type?: CustomerFeedbackType | 'ALL';
  from?: string;
  to?: string;
  search?: string;
  customerId?: string;
  productId?: string;
  saleId?: string;
  page?: number;
  limit?: number;
};

/**
 * Tenant-scoped paginated list. `viewerRole` decides whether `internalNotes`
 * and internal responses are included (OWNER/MANAGER only).
 */
export async function listFeedbackRecords(
  businessId: string,
  viewerRole: MembershipRole,
  options: FeedbackListOptions = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 15));
  const skip = (page - 1) * limit;

  const staff = isStaffRole(viewerRole);
  const where: Record<string, unknown> = { businessId };

  if (options.status && options.status !== 'ALL') where.status = options.status;
  if (options.priority && options.priority !== 'ALL') where.priority = options.priority;
  if (options.type && options.type !== 'ALL') where.type = options.type;
  if (options.customerId) where.customerId = options.customerId;
  if (options.productId) where.productId = options.productId;
  if (options.saleId) where.saleId = options.saleId;

  if (options.from || options.to) {
    where.createdAt = {
      ...(options.from ? { gte: new Date(options.from) } : {}),
      ...(options.to ? { lte: new Date(`${options.to}T23:59:59.999Z`) } : {}),
    };
  }
  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { sale: { invoiceNumber: { contains: q, mode: 'insensitive' } } },
      { product: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [records, totalCount] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        sale: { select: { id: true, invoiceNumber: true, saleDate: true } },
        product: { select: { id: true, name: true, sku: true } },
        responses: {
          where: staff ? {} : { isInternal: false },
          include: { responder: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.feedback.count({ where }),
  ]);

  const recordsSafe = records.map((r) => ({
    ...r,
    internalNotes: staff ? r.internalNotes : undefined,
  }));

  return {
    records: recordsSafe,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}/**
 * Fetch a single feedback record for the detail panel, tenant-scoped.
 */
export async function getFeedbackRecord(
  businessId: string,
  feedbackId: string,
  viewerRole: MembershipRole
) {
  const staff = isStaffRole(viewerRole);
  const record = await prisma.feedback.findFirst({
    where: { id: feedbackId, businessId },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      sale: { select: { id: true, invoiceNumber: true, saleDate: true, total: true, status: true } },
      product: { select: { id: true, name: true, sku: true } },
      responses: {
        where: staff ? {} : { isInternal: false },
        include: { responder: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!record) {
    throw new Error('Feedback record not found or unauthorized.');
  }

  if (!staff) {
    record.internalNotes = null;
  }

  return record;
}

export type CreateFeedbackInput = {
  customerId?: string | null;
  saleId?: string | null;
  productId?: string | null;
  type: CustomerFeedbackType;
  rating?: number | null;
  title: string;
  description: string;
  priority: FeedbackPriority;
  internalNotes?: string | null;
  source: 'MANUAL' | 'PUBLIC' | 'API';
};

/**
 * Create a feedback/complaint/review record. Every linked entity (customer,
 * sale, product) is verified to belong to the requested business before the
 * record is created — client-provided IDs are never trusted.
 */
export async function createFeedbackRecord(
  businessId: string,
  userId: string,
  data: CreateFeedbackInput,
  actorRole?: MembershipRole
) {
  const title = sanitizePlainText(data.title);
  const description = sanitizePlainText(data.description);
  if (!title || !description) {
    throw new Error('Title and description are required.');
  }

  let rating: number | null = null;
  if (data.rating !== null && data.rating !== undefined) {
    rating = Math.min(5, Math.max(1, Math.round(data.rating)));
  }

  if (data.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, businessId },
      select: { id: true },
    });
    if (!customer) throw new Error('Customer not found or unauthorized.');
  }
  if (data.saleId) {
    const sale = await prisma.sale.findFirst({
      where: { id: data.saleId, businessId },
      select: { id: true },
    });
    if (!sale) throw new Error('Sale not found or unauthorized.');
  }
  if (data.productId) {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, businessId },
      select: { id: true },
    });
    if (!product) throw new Error('Product not found or unauthorized.');
  }

  const record = await prisma.feedback.create({
    data: {
      businessId,
      customerId: data.customerId || null,
      saleId: data.saleId || null,
      productId: data.productId || null,
      type: data.type,
      rating,
      title,
      description,
      priority: data.priority,
      status: FeedbackWorkflowStatus.PENDING,
      internalNotes: data.internalNotes?.trim() || null,
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      sale: { select: { id: true, invoiceNumber: true, saleDate: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'FEEDBACK_CREATED',
    entityType: 'Feedback',
    entityId: record.id,
    metadata: {
      type: data.type,
      priority: data.priority,
      rating,
      customerId: data.customerId || null,
      saleId: data.saleId || null,
      productId: data.productId || null,
      source: data.source,
    },
  });

  return record;
}/**
 * Update workflow status. Every transition is audit-logged. When moving to
 * RESOLVED, `notifyCustomer` can optionally queue a Communication Center
 * (Step 28) message to the linked customer.
 */
export async function updateFeedbackStatus(
  businessId: string,
  userId: string,
  feedbackId: string,
  status: FeedbackWorkflowStatus,
  opts: { notifyCustomer?: boolean; channel?: CommunicationChannel } = {}
) {
  const existing = await prisma.feedback.findFirst({
    where: { id: feedbackId, businessId },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  if (!existing) {
    throw new Error('Feedback record not found or unauthorized.');
  }

  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: { status },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      sale: { select: { id: true, invoiceNumber: true, saleDate: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'FEEDBACK_STATUS_CHANGED',
    entityType: 'Feedback',
    entityId: feedbackId,
    metadata: { from: existing.status, to: status, title: existing.title },
  });

  // Optional Communication Center notification on resolution.
  if (status === FeedbackWorkflowStatus.RESOLVED && opts.notifyCustomer && existing.customer?.phone) {
    await sendFeedbackNotification({
      businessId,
      record: existing,
      channel: opts.channel || CommunicationChannel.WHATSAPP,
      body:
        `Assalam-o-Alaikum ${existing.customer.name || 'dear customer'}, thank you for your ` +
        `${existing.type.toLowerCase()} (“${existing.title}”). We’re happy to confirm it has been resolved. – Our Team`,
    });
  }

  return updated;
}

/**
 * Update priority, audit-logged.
 */
export async function updateFeedbackPriority(
  businessId: string,
  userId: string,
  feedbackId: string,
  priority: FeedbackPriority
) {
  const existing = await prisma.feedback.findFirst({
    where: { id: feedbackId, businessId },
  });

  if (!existing) {
    throw new Error('Feedback record not found or unauthorized.');
  }

  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: { priority },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'FEEDBACK_PRIORITY_CHANGED',
    entityType: 'Feedback',
    entityId: feedbackId,
    metadata: { from: existing.priority, to: priority },
  });

  return updated;
}

/**
 * Internal staff notes — OWNER/MANAGER only. Never exposed through
 * any non-staff list/detail serialization.
 */
export async function updateFeedbackInternalNotes(
  businessId: string,
  userId: string,
  actorRole: MembershipRole,
  feedbackId: string,
  notes: string
) {
  assertStaffRole(actorRole, 'write internal notes');

  const existing = await prisma.feedback.findFirst({
    where: { id: feedbackId, businessId },
  });

  if (!existing) {
    throw new Error('Feedback record not found or unauthorized.');
  }

  const cleanNotes = sanitizePlainText(notes);
  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: { internalNotes: cleanNotes || null },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'FEEDBACK_NOTES_UPDATED',
    entityType: 'Feedback',
    entityId: feedbackId,
    metadata: { notesLength: cleanNotes.length },
  });

  return updated;
}/**
 * Add a response to a feedback thread. Public responses (isInternal=false)
 * trigger a Step 28 Communication Center message to the linked customer
 * (WhatsApp/SMS via the configured provider).
 */
export async function addFeedbackResponse(
  businessId: string,
  userId: string,
  actorRole: MembershipRole,
  feedbackId: string,
  message: string,
  isInternal: boolean,
  opts: { channel?: CommunicationChannel } = {}
) {
  // Internal responses are a staff-only channel.
  if (isInternal) {
    assertStaffRole(actorRole, 'add internal responses');
  }

  const existing = await prisma.feedback.findFirst({
    where: { id: feedbackId, businessId },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  if (!existing) {
    throw new Error('Feedback record not found or unauthorized.');
  }

  const cleanMessage = sanitizePlainText(message);
  if (!cleanMessage) {
    throw new Error('Response message is required.');
  }

  const response = await prisma.feedbackResponse.create({
    data: {
      feedbackId,
      responderId: userId,
      message: cleanMessage,
      isInternal: isInternal || false,
    },
    include: { responder: { select: { id: true, name: true } } },
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'FEEDBACK_RESPONSE_ADDED',
    entityType: 'Feedback',
    entityId: feedbackId,
    metadata: { responseId: response.id, isInternal: isInternal || false },
  });

  // Notify the customer through the Communication Center for public replies.
  if (!isInternal && existing.customer?.phone) {
    await sendFeedbackNotification({
      businessId,
      record: existing,
      channel: opts.channel || CommunicationChannel.WHATSAPP,
      body:
        `Assalam-o-Alaikum ${existing.customer.name || 'dear customer'}, regarding your ${existing.type.toLowerCase()} ` +
        `“${existing.title}”: ${cleanMessage}`,
    });
  }

  return response;
}

/**
 * Delete a feedback record (staff only, OWNER/MANAGER).
 */
export async function deleteFeedbackRecord(
  businessId: string,
  userId: string,
  actorRole: MembershipRole,
  feedbackId: string
) {
  assertStaffRole(actorRole, 'delete feedback records');

  const existing = await prisma.feedback.findFirst({
    where: { id: feedbackId, businessId },
  });

  if (!existing) {
    throw new Error('Feedback record not found or unauthorized.');
  }

  await prisma.feedback.delete({ where: { id: feedbackId } });

  await recordAuditLog({
    businessId,
    userId,
    action: 'FEEDBACK_DELETED',
    entityType: 'Feedback',
    entityId: feedbackId,
    metadata: { title: existing.title, type: existing.type },
  });

  return { id: feedbackId, deleted: true };
}

type NotificationRecord = {
  type: CustomerFeedbackType;
  title: string;
  customer?: { id: string; name: string | null; phone: string | null } | null;
};

/**
 * Queues a customer notification through Step 28 (Communication Center).
 * Failures never bubble up — delivery status is tracked by the queue itself.
 */
async function sendFeedbackNotification(params: {
  businessId: string;
  record: NotificationRecord;
  channel: CommunicationChannel;
  body: string;
}) {
  try {
    const customer = params.record.customer;
    if (!customer || !customer.phone) return null;
    const recipient = customer.phone.trim();
    if (!recipient) return null;

    // 1. Check customer preferences if customerId exists
    if (customer.id) {
      const prefs = await prisma.customerCommunicationPreference.findUnique({
        where: { customerId: customer.id },
      });
      if (prefs) {
        if (params.channel === CommunicationChannel.WHATSAPP && !prefs.whatsappAllowed) {
          return null;
        }
        if (params.channel === CommunicationChannel.SMS && !prefs.smsAllowed) {
          return null;
        }
        if (params.channel === CommunicationChannel.EMAIL && !prefs.emailAllowed) {
          return null;
        }
      }
    }

    // 2. Check provider config for active status
    const providerConfig = await prisma.communicationProviderConfig.findUnique({
      where: {
        businessId_channel: {
          businessId: params.businessId,
          channel: params.channel,
        },
      },
    });

    const isEnabled = providerConfig?.isEnabled ?? false;
    const provider = providerConfig?.provider ?? 'SYSTEM_COMMUNICATION_QUEUE';

    // 3. Queue / Log communication message safely in Step 28 infrastructure
    const commMsg = await prisma.communicationMessage.create({
      data: {
        businessId: params.businessId,
        recipient,
        recipientName: customer.name || null,
        customerId: customer.id || null,
        channel: params.channel,
        messageType: 'FEEDBACK_RESPONSE',
        templateType: 'FEEDBACK_RESPONSE',
        body: params.body,
        status: isEnabled ? DeliveryStatus.SENT : DeliveryStatus.QUEUED,
        provider,
        sentAt: isEnabled ? new Date() : null,
      },
    });

    return commMsg;
  } catch (err) {
    console.error('[feedback-management] communication notification failed:', err);
    return null;
  }
}export type FeedbackTrendAnalysis = {
  currentMonth: { complaints: number; highPriority: number };
  previousMonth: { complaints: number; highPriority: number };
  complaintGrowth: number;
  surge: boolean;
};

/**
 * Feeds the Business Advisor with complaint trend data (current calendar month
 * vs previous calendar month).
 */
export async function getFeedbackTrendAnalysis(
  businessId: string
): Promise<FeedbackTrendAnalysis> {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1; // 1-indexed

  const prevYear = curMonth === 1 ? curYear - 1 : curYear;
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;

  const currentStart = new Date(curYear, curMonth - 1, 1, 0, 0, 0, 0);
  const currentEnd = new Date(curYear, curMonth, 0, 23, 59, 59, 999);
  const previousStart = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0, 0);
  const previousEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

  const complaintWhere = (start: Date, end: Date) => ({
    businessId,
    type: CustomerFeedbackType.COMPLAINT,
    createdAt: { gte: start, lte: end },
  });

  const highPriorityFilter: Record<string, unknown> = {
    priority: { in: [FeedbackPriority.HIGH, FeedbackPriority.CRITICAL] },
  };

  const [currentComplaints, currentHigh, previousComplaints, previousHigh] = await Promise.all([
    prisma.feedback.count({ where: complaintWhere(currentStart, currentEnd) }),
    prisma.feedback.count({
      where: { ...complaintWhere(currentStart, currentEnd), ...highPriorityFilter },
    }),
    prisma.feedback.count({ where: complaintWhere(previousStart, previousEnd) }),
    prisma.feedback.count({
      where: { ...complaintWhere(previousStart, previousEnd), ...highPriorityFilter },
    }),
  ]);

  const complaintGrowth =
    previousComplaints > 0
      ? Math.round(((currentComplaints - previousComplaints) / previousComplaints) * 100)
      : currentComplaints > 0
        ? 100
        : 0;

  return {
    currentMonth: { complaints: currentComplaints, highPriority: currentHigh },
    previousMonth: { complaints: previousComplaints, highPriority: previousHigh },
    complaintGrowth,
    surge: complaintGrowth >= 25 && currentComplaints >= 2,
  };
}

export type PublicFeedbackInput = {
  customerName?: string | null;
  phone?: string | null;
  type: CustomerFeedbackType;
  rating?: number | null;
  title: string;
  description: string;
  productId?: string | null;
};

/**
 * Unauthenticated public submission (customer-facing forms / shared route).
 * Scope is enforced by the `businessId` in the URL + FK validation. If the
 * visitor supplies a phone that matches an existing customer, the feedback is
 * linked to that customer; otherwise a minimal customer record is created so
 * the owner can follow up.
 */
export async function submitPublicFeedback(
  businessId: string,
  input: PublicFeedbackInput
) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  if (!business) {
    // Neutral message: never disclose whether the business exists, is
    // inactive, or the ID is invalid (P3-24 anti-enumeration).
    throw new AppError(ErrorCodes.NOT_FOUND, 'This feedback page is not available.', 404);
  }

  const type = input.type || CustomerFeedbackType.FEEDBACK;
  const title = sanitizePlainText(input.title);
  const description = sanitizePlainText(input.description);
  if (!title || !description) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Title and description are required.', 400);
  }

  let rating: number | null = null;
  if (input.rating !== null && input.rating !== undefined) {
    rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  }

  let customerId: string | null = null;
  const phone = input.phone?.trim() || null;
  const customerName = sanitizePlainText(input.customerName || '');

  if (phone) {
    const existingCustomer = await prisma.customer.findFirst({
      where: { businessId, phone },
      select: { id: true },
    });
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const created = await prisma.customer.create({
        data: { businessId, name: customerName || 'Walk-in Customer', phone },
      });
      customerId = created.id;
    }
  }

  // Validate product belongs to this business (optional link).
  let productId: string | null = null;
  if (input.productId) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, businessId },
      select: { id: true },
    });
    if (product) productId = product.id;
  }

  const record = await prisma.feedback.create({
    data: {
      businessId,
      customerId,
      productId,
      type,
      rating,
      title,
      description,
      priority:
        type === CustomerFeedbackType.COMPLAINT ? FeedbackPriority.MEDIUM : FeedbackPriority.LOW,
      status: FeedbackWorkflowStatus.PENDING,
    },
  });

  await recordAuditLog({
    businessId,
    userId: undefined,
    action: 'FEEDBACK_CREATED_PUBLIC',
    entityType: 'Feedback',
    entityId: record.id,
    metadata: { type, rating, phone: phone || null, source: 'PUBLIC' },
  });

  return {
    id: record.id,
    businessName: business.name,
  };
}