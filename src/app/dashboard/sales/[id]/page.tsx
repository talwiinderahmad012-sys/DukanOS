import { requireActiveBusiness } from '@/lib/auth/guards';
import { getSaleById } from '@/services/sales';
import { notFound, redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions/permissions-core';
import { SaleDetailClient, type SaleDetailData } from './sale-detail-client';

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  const { id } = await params;

  const sale = await getSaleById(business.id, id);
  if (!sale) {
    notFound();
  }

  // Realized profit is restricted to VIEW_PROFIT roles. For denied roles the
  // figure is stripped server-side (never serialized) and the UI hides it.
  const canViewProfit = hasPermission(membership.role, 'VIEW_PROFIT');

  const saleData: SaleDetailData = {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    saleDate: sale.saleDate.toISOString(),
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    total: Number(sale.total),
    paidAmount: Number(sale.paidAmount),
    discount: Number(sale.discount),
    subtotal: Number(sale.subtotal),
    totalProfit: canViewProfit
      ? sale.items.reduce((acc, item) => acc + Number(item.lineProfit), 0)
      : 0,
    customer: sale.customer
      ? {
          id: sale.customer.id,
          name: sale.customer.name,
          phone: sale.customer.phone,
          address: sale.customer.address,
        }
      : null,
    business: {
      name: sale.business.name,
      phone: sale.business.phone,
      address: sale.business.address,
      city: sale.business.city,
    },
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      unit: item.product.unit,
      quantity: item.quantity,
      sellingPrice: Number(item.sellingPrice),
      discount: Number(item.discount),
      lineTotal: Number(item.lineTotal),
      currentStock: item.product.currentStock,
    })),
  };

  return <SaleDetailClient businessId={business.id} sale={saleData} canViewProfit={canViewProfit} />;
}
