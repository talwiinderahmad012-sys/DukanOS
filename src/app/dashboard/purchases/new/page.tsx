import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { PurchaseForm } from '@/components/purchases/purchase-form';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export default async function NewPurchasePage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/dashboard/purchases" className="transition-colors hover:text-primary">
              Purchases
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </li>
          <li aria-current="page" className="font-medium text-gray-900">
            New Purchase Invoice
          </li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record New Purchase</h1>
        <p className="mt-1 text-sm text-muted">
          Receive stock from a supplier, update unit costs, and record invoice details.
        </p>
      </div>

      <PurchaseForm
        businessId={business.id}
        suppliers={suppliers}
        initialProducts={serializedProducts}
      />
    </div>
  );
}
