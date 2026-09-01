import { requireActiveBusiness } from '@/lib/auth/guards';
import { getSupplierWithPurchases } from '@/services/suppliers';
import { notFound, redirect } from 'next/navigation';
import {
  SupplierDetailClient,
  type SupplierDetailViewData,
} from './supplier-detail-client';

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  const { id } = await params;

  const data = await getSupplierWithPurchases(business.id, id);
  if (!data) {
    notFound();
  }

  const { supplier, summary, purchases } = data;
  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const viewData: SupplierDetailViewData = {
    supplier: {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
      isActive: supplier.isActive,
    },
    summary: {
      totalPurchases: summary.totalPurchases,
      totalSpend: summary.totalSpend,
      totalPaid: summary.totalPaid,
      remainingDue: summary.remainingDue,
      lastPurchaseDate: summary.lastPurchaseDate?.toISOString() ?? null,
    },
    purchases: purchases.map((purchase) => ({
      id: purchase.id,
      invoiceNumber: purchase.invoiceNumber,
      purchaseDate: purchase.purchaseDate.toISOString(),
      status: purchase.status,
      total: Number(purchase.total),
      paidAmount: Number(purchase.paidAmount),
      itemCount: purchase.items.length,
    })),
  };

  return (
    <SupplierDetailClient businessId={business.id} canManage={canManage} data={viewData} />
  );
}
