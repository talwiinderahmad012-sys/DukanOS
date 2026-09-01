import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getPurchaseById } from '@/services/purchases';
import { notFound, redirect } from 'next/navigation';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import {
  PurchaseDetailClient,
  type PurchaseDetailData,
  type PurchaseItemData,
} from './purchase-detail-client';

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  if (!canAccessDashboardPath(membership.role, '/dashboard/purchases')) {
    return <ForbiddenView role={membership.role} />;
  }

  const purchase = await getPurchaseById(business.id, id);
  if (!purchase) {
    notFound();
  }

  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const items: PurchaseItemData[] = purchase.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    sku: item.product.sku,
    unit: item.product.unit,
    quantity: item.quantity,
    purchasePrice: Number(item.purchasePrice),
    discount: Number(item.discount),
    lineTotal: Number(item.lineTotal),
    currentStock: item.product.currentStock,
  }));

  const data: PurchaseDetailData = {
    id: purchase.id,
    invoiceNumber: purchase.invoiceNumber,
    status: purchase.status,
    purchaseDate: new Date(purchase.purchaseDate).toISOString(),
    subtotal: Number(purchase.subtotal),
    discount: Number(purchase.discount),
    total: Number(purchase.total),
    paidAmount: Number(purchase.paidAmount),
    notes: purchase.notes,
    supplier: purchase.supplier
      ? { id: purchase.supplier.id, name: purchase.supplier.name, phone: purchase.supplier.phone }
      : null,
    items,
  };

  return <PurchaseDetailClient businessId={business.id} purchase={data} canManage={canManage} />;
}
