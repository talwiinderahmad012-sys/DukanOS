import { requirePlatformAdmin } from '@/lib/auth/platform-admin';
import {
  getActivationFunnelMetrics,
  getFeatureAdoptionMetrics,
  getUserRetentionMetrics,
  getReliabilityMetrics,
  getProductHealthScore,
} from '@/services/product-analytics';
import type { Metadata } from 'next';
import { ProductInsightsPageClient } from './product-insights-client';

export const metadata: Metadata = {
  title: 'Product Insights & Usage Telemetry | DukaanOS',
  description: 'Aggregate product analytics, activation funnel, feature adoption, and system reliability metrics.',
};

export default async function ProductInsightsPage() {
  await requirePlatformAdmin();

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
