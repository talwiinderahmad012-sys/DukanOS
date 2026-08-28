import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listPurchases } from '@/services/purchases';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import {
  PurchasesPageClient,
  type PurchaseRowData,
  type PurchasesSummaryData,
  type SupplierFilterOption,
} from './purchases-page-client';

const PAGE_SIZE = 25;

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    supplierId?: string;
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const search = (params.search ?? '').trim();
  const supplierId = params.supplierId || 'ALL';
  const status = params.status || 'ALL';
  const paymentStatus = params.paymentStatus || 'ALL';
  const startDate = params.startDate || '';
  const endDate = params.endDate || '';
  const page = Math.max(1, Number(params.page) || 1);

  const [purchasesData, suppliers] = await Promise.all([
    listPurchases(business.id, {
      search: search || undefined,
      supplierId,
      status,
      paymentStatus,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    prisma.supplier.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const { purchases, summary, totalPages, totalCount } = purchasesData;

  const rows: PurchaseRowData[] = purchases.map((purchase) => ({
    id: purchase.id,
    invoiceNumber: purchase.invoiceNumber,
    purchaseDate: purchase.purchaseDate.toISOString(),
    status: purchase.status,
    total: Number(purchase.total),
    paidAmount: Number(purchase.paidAmount),
    itemCount: purchase.items.length,
    supplier: purchase.supplier ? { id: purchase.supplier.id, name: purchase.supplier.name } : null,
  }));

  const summaryData: PurchasesSummaryData = {
    totalSpend: summary.totalSpend,
    totalPaid: summary.totalPaid,
    remainingDue: summary.remainingDue,
    invoiceCount: summary.invoiceCount,
  };

  const supplierOptions: SupplierFilterOption[] = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }));

  const activeSupplierCount = suppliers.filter((s) => s.isActive).length;

  return (
    <PurchasesPageClient
      purchases={rows}
      summary={summaryData}
      suppliers={supplierOptions}
      activeSupplierCount={activeSupplierCount}
      totalPages={totalPages}
      totalCount={totalCount}
      canManage={canManage}
      search={search}
      supplierId={supplierId}
      status={status}
      paymentStatus={paymentStatus}
      startDate={startDate}
      endDate={endDate}
      page={page}
    />
  );
}
