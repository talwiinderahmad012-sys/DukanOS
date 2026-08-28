import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import {
  getProductFeedbackOverview,
  listBugReports,
  listProductFeedbacks,
} from '@/services/product-feedback';
import { ProductFeedbackPageClient } from './product-feedback-page-client';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Feedback & Bug Triage | DukaanOS',
  description: 'Manage user-reported bugs, platform satisfaction reviews, and feature requests.',
};

export default async function ProductFeedbackPage() {
  const { membership } = await getActiveBusiness();

  if (membership.role !== 'OWNER') redirect('/dashboard');

  const [overview, bugs, features] = await Promise.all([
    getProductFeedbackOverview(),
    listBugReports(),
    listProductFeedbacks(),
  ]);

  return (
    <ProductFeedbackPageClient
      overview={{
        bugs: {
          open: overview.bugs.open,
          p0: overview.bugs.p0,
          resolved: overview.bugs.resolved,
        },
        satisfaction: {
          total: overview.satisfaction.total,
          great: overview.satisfaction.great,
          okay: overview.satisfaction.okay,
          needsImprovement: overview.satisfaction.needsImprovement,
        },
        featureRequests: {
          total: overview.featureRequests.total,
          planned: overview.featureRequests.planned,
          shipped: overview.featureRequests.shipped,
        },
      }}
      bugs={bugs as unknown[]}
      features={features as unknown[]}
    />
  );
}
