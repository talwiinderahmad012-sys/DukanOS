import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { getCustomerWithLedger } from '@/services/customers';
import { getCustomerInsights } from '@/services/customer-insights';
import {
  CustomerProfileView,
  type AuditRow,
  type CustomerViewData,
  type InsightsView,
} from '@/components/customers/customer-profile-view';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { MembershipRole } from '@/generated/prisma/client';

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

  const viewData: CustomerViewData = {
    customer: {
      id: customerData.customer.id,
      name: customerData.customer.name,
      phone: customerData.customer.phone,
      email: customerData.customer.email,
      address: customerData.customer.address,
      notes: customerData.customer.notes,
      status: customerData.customer.status,
      isActive: customerData.customer.isActive,
      createdAt: customerData.customer.createdAt,
      updatedAt: customerData.customer.updatedAt,
    },
    summary: {
      totalSalesCount: customerData.summary.totalSalesCount,
      totalSpend: customerData.summary.totalSpend,
      totalPaid: customerData.summary.totalPaid,
      outstanding: Number(customerData.summary.outstanding),
      lastPurchaseDate: customerData.summary.lastPurchaseDate,
    },
    sales: customerData.sales.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      saleDate: sale.saleDate,
      status: sale.status,
      total: Number(sale.total),
      paidAmount: Number(sale.paidAmount),
      itemCount: sale.items.length,
    })),
    payments: customerData.payments.map((payment) => ({
      id: payment.id,
      date: payment.date,
      amount: Number(payment.amount),
      method: payment.method,
      notes: payment.notes,
    })),
    ledger: customerData.ledger.map((entry) => ({
      id: entry.id,
      date: entry.date,
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
      createdAt: feedback.createdAt,
    })),
  };

  const insightsView: InsightsView = {
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

  const auditRows: AuditRow[] = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    metadata:
      typeof log.metadata === 'string' && log.metadata.trim()
        ? log.metadata
        : log.metadata
          ? JSON.stringify(log.metadata)
          : null,
    createdAt: log.createdAt,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted">
          <li>
            <Link
              href="/dashboard/customers"
              className="flex items-center gap-1 font-medium hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Customers
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </li>
          <li aria-current="page">
            <span className="font-semibold text-gray-900">{customerData.customer.name}</span>
          </li>
        </ol>
      </nav>

      <CustomerProfileView
        businessId={business.id}
        data={viewData}
        insights={insightsView}
        auditLogs={auditRows}
        canManage={canManage}
        canPay={canPay}
      />
    </div>
  );
}
