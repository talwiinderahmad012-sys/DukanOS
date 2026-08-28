import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { NewProductPageClient } from './new-product-page-client';

export default async function NewProductPage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  if (!canAccessDashboardPath(membership.role, '/dashboard/products/new')) {
    return <ForbiddenView role={membership.role} />;
  }

  const categories = await prisma.category.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true, name: true, nameEn: true, nameUr: true },
    orderBy: { name: 'asc' },
  });

  return (
    <NewProductPageClient
      businessId={business.id}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        nameEn: category.nameEn,
        nameUr: category.nameUr,
      }))}
    />
  );
}
