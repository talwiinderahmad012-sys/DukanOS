import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listSales } from '@/services/sales';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import {
  SalesPageClient,
  type CustomerOption,
  type SaleRowData,
  type SalesSummaryData,
} from './sales-page-client';

const PAGE_SIZE = 25;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    customerId?: string;
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const search = (params.search ?? '').trim();
  const customerId = params.customerId || 'ALL';
  const status = params.status || 'ALL';
  const paymentStatus = params.paymentStatus || 'ALL';
  const startDate = params.startDate || '';
  const endDate = params.endDate || '';
  const page = Math.max(1, Number(params.page) || 1);

  const [salesData, customers] = await Promise.all([
    listSales(business.id, {
      search: search || undefined,
      customerId,
      status,
      paymentStatus,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    prisma.customer.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const { sales, summary, totalPages, totalCount } = salesData;

  const saleRows: SaleRowData[] = sales.map((sale) => ({
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    saleDate: sale.saleDate.toISOString(),
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    total: Number(sale.total),
    paidAmount: Number(sale.paidAmount),
    itemCount: sale.items.length,
    customer: sale.customer ? { id: sale.customer.id, name: sale.customer.name } : null,
  }));

  const summaryData: SalesSummaryData = {
    totalRevenue: summary.totalRevenue,
    totalPaid: summary.totalPaid,
    totalProfit: summary.totalProfit,
    remainingDue: summary.remainingDue,
    invoiceCount: summary.invoiceCount,
  };

  const customerOptions: CustomerOption[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
  }));

  return (
    <SalesPageClient
      sales={saleRows}
      summary={summaryData}
      customers={customerOptions}
      totalPages={totalPages}
      totalCount={totalCount}
      search={search}
      customerId={customerId}
      status={status}
      paymentStatus={paymentStatus}
      startDate={startDate}
      endDate={endDate}
      page={page}
    />
  );
}
