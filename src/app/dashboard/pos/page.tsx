import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { POSTerminal } from '@/components/pos/pos-terminal';
import { redirect } from 'next/navigation';

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
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POS Terminal</h1>
          <p className="text-xs text-gray-500">Quick shop cashier desk, barcode sales & credit invoicing</p>
        </div>
      </div>

      <POSTerminal
        businessId={business.id}
        currency={business.currency}
        initialProducts={serializedProducts}
        initialCustomers={serializedCustomers}
      />
    </div>
  );
}
