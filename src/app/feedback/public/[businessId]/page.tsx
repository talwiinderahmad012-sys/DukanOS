import { prisma } from '@/lib/db/prisma';
import { PublicFeedbackSubmitForm } from '@/components/feedback/public-feedback-submit-form';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Share Your Feedback',
};

/**
 * Public, shareable feedback submission route (Step 29).
 * Any customer with the link can submit feedback, a review, or a complaint.
 * No authentication required — scope is enforced by the businessId in the URL.
 */
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
      city: true,
      description: true,
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-sm text-gray-500">
            We value your opinion! Share your feedback, review, or complaint below —
            it goes directly to the owner.
          </p>
        </div>

        <PublicFeedbackSubmitForm
          businessId={business.id}
          products={business.products}
        />

        <p className="text-center text-[11px] text-gray-400">
          Powered by DukaanOS · Your submission is private and only visible to the business owner.
        </p>
      </div>
    </div>
  );
}