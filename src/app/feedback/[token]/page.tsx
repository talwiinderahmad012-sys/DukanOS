import { verifyFeedbackToken } from '@/services/feedback';
import { FeedbackTokenPageClient } from './feedback-token-page-client';

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verification = await verifyFeedbackToken(token);

  return <FeedbackTokenPageClient verification={verification} />;
}
