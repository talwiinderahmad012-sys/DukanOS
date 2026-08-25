import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { POSTerminal } from '@/components/pos/pos-terminal';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClasses } from '@/components/ui/button';

export default async function POSPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        unit: true,
        purchasePrice: true,
        sellingPrice: true,
        currentStock: true,
        category: {
          select: { id: true, name: true },
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

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        title="POS Terminal"
        description="Fast checkout desk — barcode scanning, cash sales and credit (Udhaar) invoicing."
        actions={
          <Link href="/dashboard/sales" className={buttonClasses('outline', 'sm')}>
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
            Sales Invoices
          </Link>
        }
      />

      <POSTerminal
        businessId={business.id}
        currency={business.currency}
        initialProducts={serializedProducts}
        initialCustomers={serializedCustomers}
      />
    </div>
  );
}
