import { requireActiveBusiness } from '@/lib/auth/guards';
import { getFeedbackStats, listFeedbackRecords } from '@/services/feedback-management';
import { getFeedbackDashboardStats, listBusinessFeedback } from '@/services/feedback';
import {
  FeedbackHub,
  type FeedbackComplaintStats,
  type FeedbackRecordRow,
  type FeedbackRecordsData,
  type LegacyFeedbackRow,
  type LegacyFeedbackStats,
  type LegacyFeedbacksData,
} from '@/components/feedback/feedback-hub';
import {
  CustomerFeedbackType,
  FeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackWorkflowStatus,
  MembershipRole,
} from '@/generated/prisma/client';

export default async function FeedbackDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    status?: string;
    priority?: string;
    type?: string;
    rating?: string;
    category?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const rating = params.rating ? Number(params.rating) : undefined;
  const status = (params.status || 'ALL') as FeedbackWorkflowStatus | FeedbackStatus | 'ALL';
  const category = (params.category || 'ALL') as FeedbackCategory | 'ALL';
  const activeTab = (params.tab === 'reviews' ? 'reviews' : 'complaints') as 'complaints' | 'reviews';

  const role = membership.role;
  const isOwnerOrManager = role === MembershipRole.OWNER || role === MembershipRole.MANAGER;

  const [complaintStats, recordsData, legacyStats, legacyFeedbacksData] = await Promise.all([
    getFeedbackStats(business.id),
    listFeedbackRecords(business.id, role, {
      search: params.search,
      status: status as FeedbackWorkflowStatus | 'ALL',
      priority: (params.priority || 'ALL') as FeedbackPriority | 'ALL',
      type: (params.type || 'ALL') as CustomerFeedbackType | 'ALL',
      from: params.from,
      to: params.to,
      page,
      limit: 15,
    }),
    getFeedbackDashboardStats(business.id),
    listBusinessFeedback(business.id, {
      search: params.search,
      status: status as FeedbackStatus | 'ALL',
      category,
      rating,
      page,
      limit: 20,
    }),
  ]);

  const filters = {
    search: params.search || '',
    status: params.status || 'ALL',
    priority: params.priority || 'ALL',
    type: params.type || 'ALL',
    from: params.from || '',
    to: params.to || '',
    page,
  };

  const legacyFilters = {
    search: params.search || '',
    rating: params.rating || '',
    status: params.status || 'ALL',
  };

  const statsData: FeedbackComplaintStats = {
    total: complaintStats.total,
    pending: complaintStats.pending,
    inProgress: complaintStats.inProgress,
    resolved: complaintStats.resolved,
    rejected: complaintStats.rejected,
    averageRating: complaintStats.averageRating,
    positiveCount: complaintStats.positiveCount,
    negativeCount: complaintStats.negativeCount,
    highPriorityOpen: complaintStats.highPriorityOpen,
  };

  const serializedRecords: FeedbackRecordRow[] = recordsData.records.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    priority: r.priority,
    rating: r.rating,
    title: r.title,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    internalNotes: r.internalNotes ?? null,
    customer: r.customer
      ? { id: r.customer.id, name: r.customer.name, phone: r.customer.phone }
      : null,
    sale: r.sale ? { id: r.sale.id, invoiceNumber: r.sale.invoiceNumber } : null,
    product: r.product ? { id: r.product.id, name: r.product.name, sku: r.product.sku } : null,
    responses: (r.responses ?? []).map((resp) => ({
      id: resp.id,
      message: resp.message,
      isInternal: resp.isInternal,
      createdAt: resp.createdAt.toISOString(),
      responder: resp.responder ? { id: resp.responder.id, name: resp.responder.name } : null,
    })),
    responseCount: r._count?.responses ?? 0,
  }));

  const serializedRecordsData: FeedbackRecordsData = {
    records: serializedRecords,
    pagination: {
      total: recordsData.pagination.total,
      page: recordsData.pagination.page,
      limit: recordsData.pagination.limit,
      totalPages: recordsData.pagination.totalPages,
    },
  };

  const legacyStatsData: LegacyFeedbackStats = {
    totalReviews: legacyStats.totalReviews,
    averageRating: legacyStats.averageRating,
    positiveCount: legacyStats.positiveCount,
    neutralCount: legacyStats.neutralCount,
    negativeCount: legacyStats.negativeCount,
    newCount: legacyStats.newCount,
    resolvedCount: legacyStats.resolvedCount,
    categories: legacyStats.categories.map((c) => ({
      category: c.category,
      count: c.count,
      averageRating: c.averageRating,
    })),
  };

  const serializedLegacyFeedbacks: LegacyFeedbackRow[] = legacyFeedbacksData.feedbacks.map((f) => ({
    id: f.id,
    rating: f.rating,
    message: f.message,
    category: f.category,
    status: f.status,
    isAnonymous: f.isAnonymous,
    resolutionNote: f.resolutionNote,
    createdAt: f.createdAt.toISOString(),
    customer: f.customer
      ? { id: f.customer.id, name: f.customer.name, phone: f.customer.phone }
      : null,
    sale: f.sale ? { id: f.sale.id, invoiceNumber: f.sale.invoiceNumber } : null,
  }));

  const serializedLegacyFeedbacksData: LegacyFeedbacksData = {
    feedbacks: serializedLegacyFeedbacks,
    pagination: {
      total: legacyFeedbacksData.pagination.total,
      page: legacyFeedbacksData.pagination.page,
      limit: legacyFeedbacksData.pagination.limit,
      totalPages: legacyFeedbacksData.pagination.totalPages,
    },
  };

  return (
    <FeedbackHub
      businessId={business.id}
      role={role}
      isOwnerOrManager={isOwnerOrManager}
      activeTab={activeTab}
      complaintStats={statsData}
      recordsData={serializedRecordsData}
      filters={filters}
      legacyStats={legacyStatsData}
      legacyFeedbacksData={serializedLegacyFeedbacksData}
      legacyFilters={legacyFilters}
    />
  );
}
