import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { ProductForm } from '@/components/products/product-form';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NewProductPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/login'));
  
  const categories = await prisma.category.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/dashboard/products" className="hover:text-blue-600 transition-colors">Products</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New Product</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-500 text-sm">Create a new product for your catalog.</p>
        </div>
      </div>

      <ProductForm businessId={business.id} categories={categories} />
    </div>
  );
}
