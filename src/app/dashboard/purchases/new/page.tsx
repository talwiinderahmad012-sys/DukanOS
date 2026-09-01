import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { NewPurchaseClient } from './new-purchase-client';

export default async function NewPurchasePage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  // Creating purchase orders requires CREATE_PURCHASE (OWNER/MANAGER).
  if (!canAccessDashboardPath(membership.role, '/dashboard/purchases/new')) {
    return <ForbiddenView role={membership.role} />;
  }

  const [suppliers, products] = await Promise.all([
    prisma.supplier.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        unit: true,
        purchasePrice: true,
        currentStock: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    unit: p.unit,
    purchasePrice: Number(p.purchasePrice),
    currentStock: p.currentStock,
  }));

  return (
    <NewPurchaseClient
      businessId={business.id}
      suppliers={suppliers}
      initialProducts={serializedProducts}
    />
  );
}
