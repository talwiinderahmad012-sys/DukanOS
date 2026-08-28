import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getSaleById } from '@/services/sales';
import { notFound, redirect } from 'next/navigation';
import { SaleDetailClient, type SaleDetailData } from './sale-detail-client';

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const sale = await getSaleById(business.id, id);
  if (!sale) {
    notFound();
  }

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
    totalProfit: sale.items.reduce((acc, item) => acc + Number(item.lineProfit), 0),
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

  return <SaleDetailClient businessId={business.id} sale={saleData} />;
}
