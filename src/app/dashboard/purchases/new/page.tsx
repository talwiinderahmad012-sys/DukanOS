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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/purchases" className="hover:text-blue-600 transition-colors">
          Purchases
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-medium">New Purchase Invoice</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record New Purchase</h1>
        <p className="text-gray-500 text-sm mt-1">
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
