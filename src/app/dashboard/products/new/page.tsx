import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { ProductForm } from '@/components/products/product-form';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClasses } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NewProductPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/login'));

  const categories = await prisma.category.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div aria-label="Breadcrumb">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/dashboard/products" className="transition-colors hover:text-primary">
                Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-gray-900">
              New Product
            </li>
          </ol>
        </nav>
      </div>

      <PageHeader
        title="Add Product"
        description="Create a new product, set its pricing and reorder level."
        actions={
          <Link href="/dashboard/products" className={buttonClasses('outline', 'sm')}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Products
          </Link>
        }
      />

      <ProductForm businessId={business.id} categories={categories} />
    </div>
  );
}
