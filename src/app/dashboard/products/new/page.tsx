import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { NewProductPageClient } from './new-product-page-client';

export default async function NewProductPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/login'));

  const categories = await prisma.category.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <NewProductPageClient
      businessId={business.id}
      categories={categories.map((category) => ({ id: category.id, name: category.name }))}
    />
  );
}
