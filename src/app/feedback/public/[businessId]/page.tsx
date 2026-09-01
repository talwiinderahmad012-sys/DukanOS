import { PublicFeedbackPageClient } from './public-feedback-page-client';

export const metadata = {
  title: 'Share Your Feedback',
};

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  // Privacy (P3-24): this public route must not act as a business-existence
  // oracle and must not expose product lists to anonymous visitors. We render
  // the form unconditionally with a generic title. Missing or inactive businesses
  // fail silently on submission.
  return (
    <PublicFeedbackPageClient
      available={true}
      businessId={businessId}
      businessName="Business Feedback"
    />
  );
}
