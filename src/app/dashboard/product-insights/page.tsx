import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import {
  getActivationFunnelMetrics,
  getFeatureAdoptionMetrics,
  getUserRetentionMetrics,
  getReliabilityMetrics,
  getProductHealthScore,
} from '@/services/product-analytics';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductInsightsPageClient } from './product-insights-client';

export const metadata: Metadata = {
  title: 'Product Insights & Usage Telemetry | DukaanOS',
  description: 'Aggregate product analytics, activation funnel, feature adoption, and system reliability metrics.',
};

export default async function ProductInsightsPage() {
  const { membership } = await getActiveBusiness();

  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const [funnel, adoption, retention, reliability, healthScore] = await Promise.all([
    getActivationFunnelMetrics(),
    getFeatureAdoptionMetrics(),
    getUserRetentionMetrics(),
    getReliabilityMetrics(),
    getProductHealthScore(),
  ]);

  return (
    <ProductInsightsPageClient
      healthScore={healthScore}
      funnel={funnel}
      adoption={adoption}
      retention={retention}
      reliability={reliability}
    />
  );
}
