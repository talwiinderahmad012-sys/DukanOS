import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { getCustomerWithLedger } from '@/services/customers';
import { getCustomerInsights } from '@/services/customer-insights';
import { notFound, redirect } from 'next/navigation';
import { MembershipRole } from '@/generated/prisma/client';
import {
  CustomerDetailClient,
  type AuditRowData,
  type CustomerViewDataSerial,
  type InsightsViewSerial,
} from './customer-detail-client';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const [customerData, insights, auditLogs] = await Promise.all([
    getCustomerWithLedger(business.id, id),
    getCustomerInsights(business.id, id).catch(() => null),
    prisma.auditLog.findMany({
      where: {
        businessId: business.id,
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  if (!customerData || !insights) {
    notFound();
  }

  const role = membership.role;
  const canManage = role === MembershipRole.OWNER || role === MembershipRole.MANAGER;
  const canPay = canManage || role === MembershipRole.CASHIER;

  const viewData: CustomerViewDataSerial = {
    customer: {
      id: customerData.customer.id,
      name: customerData.customer.name,
      phone: customerData.customer.phone,
      email: customerData.customer.email,
      address: customerData.customer.address,
      notes: customerData.customer.notes,
      status: customerData.customer.status,
      isActive: customerData.customer.isActive,
      createdAt: customerData.customer.createdAt.toISOString(),
      updatedAt: customerData.customer.updatedAt.toISOString(),
    },
    summary: {
      totalSalesCount: customerData.summary.totalSalesCount,
      totalSpend: customerData.summary.totalSpend,
      totalPaid: customerData.summary.totalPaid,
      outstanding: Number(customerData.summary.outstanding),
      lastPurchaseDate: customerData.summary.lastPurchaseDate?.toISOString() ?? null,
    },
    sales: customerData.sales.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      saleDate: sale.saleDate.toISOString(),
      status: sale.status,
      total: Number(sale.total),
      paidAmount: Number(sale.paidAmount),
      itemCount: sale.items.length,
    })),
    payments: customerData.payments.map((payment) => ({
      id: payment.id,
      date: payment.date.toISOString(),
      amount: Number(payment.amount),
      method: payment.method,
      notes: payment.notes,
    })),
    ledger: customerData.ledger.map((entry) => ({
      id: entry.id,
      date: entry.date.toISOString(),
      type: entry.type,
      description: entry.description,
      debit: Number(entry.debit),
      credit: Number(entry.credit),
      runningBalance: Number(entry.runningBalance),
      referenceId: entry.referenceId,
    })),
    feedbacks: customerData.customer.feedbacks.map((feedback) => ({
      id: feedback.id,
      rating: feedback.rating,
      category: feedback.category,
      status: feedback.status,
      message: feedback.message,
      resolutionNote: feedback.resolutionNote,
      createdAt: feedback.createdAt.toISOString(),
    })),
  };

  const insightsView: InsightsViewSerial = {
    totalPurchases: insights.totalPurchases,
    totalSpent: insights.totalSpent,
    averageOrderValue: Number(insights.averageOrderValue),
    purchaseFrequencyDays: insights.purchaseFrequencyDays,
    daysActive: insights.daysActive,
    topProducts: insights.topProducts.map((product) => ({
      productId: product.productId,
      name: product.name,
      unit: product.unit,
      totalQuantity: product.totalQuantity,
      orderCount: product.orderCount,
      totalSpend: Number(product.totalSpend),
    })),
    feedbackCount: insights.feedbackCount,
    averageRating: insights.averageRating,
  };

  const auditRows: AuditRowData[] = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    metadata:
      typeof log.metadata === 'string' && log.metadata.trim()
        ? log.metadata
        : log.metadata
          ? JSON.stringify(log.metadata)
          : null,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <CustomerDetailClient
      businessId={business.id}
      customerName={customerData.customer.name}
      data={viewData}
      insights={insightsView}
      auditLogs={auditRows}
      canManage={canManage}
      canPay={canPay}
    />
  );
}
