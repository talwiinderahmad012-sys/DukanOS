import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { POSCheckoutScreen } from '@/components/pos/pos-checkout-screen';
import { redirect } from 'next/navigation';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { getServerContentLanguage } from '@/lib/translation/server-language';
import { getLocalizedValue } from '@/lib/translation/localized';

export default async function POSPage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  // The POS must never present a usable checkout interface to roles that
  // cannot create sales. EMPLOYEE has no CREATE_SALE capability, so the page
  // renders the accessible forbidden state instead of the checkout screen.
  if (!canAccessDashboardPath(membership.role, '/dashboard/pos')) {
    return <ForbiddenView role={membership.role} showFinancialNote={false} />;
  }

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameUr: true,
        sku: true,
        barcode: true,
        unit: true,
        purchasePrice: true,
        sellingPrice: true,
        currentStock: true,
        category: {
          select: { id: true, name: true, nameEn: true, nameUr: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.customer.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        outstanding: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    nameUr: p.nameUr,
    sku: p.sku,
    barcode: p.barcode,
    unit: p.unit,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
    currentStock: p.currentStock,
    category: p.category,
  }));

  const serializedCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    outstanding: Number(c.outstanding),
  }));

  const displayLanguage = await getServerContentLanguage();

  return (
    <POSCheckoutScreen
      businessId={business.id}
      businessName={getLocalizedValue(business, 'name', displayLanguage) ?? business.name}
      currency={business.currency}
      initialProducts={serializedProducts}
      initialCustomers={serializedCustomers}
    />
  );
}
