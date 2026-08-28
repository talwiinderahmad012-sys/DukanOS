import { prisma } from '@/lib/db/prisma';
import { PublicFeedbackPageClient } from './public-feedback-page-client';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Share Your Feedback',
};

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  const business = await prisma.business.findFirst({
    where: { id: businessId, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      products: {
        where: { isActive: true },
        select: { id: true, name: true },
        take: 100,
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!business) {
    notFound();
  }

  return (
    <PublicFeedbackPageClient
      businessId={business.id}
      businessName={business.name}
      products={business.products}
    />
  );
}
