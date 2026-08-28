'use client';

import Link from 'next/link';
import {
  TrendingUp,
  ShieldCheck,
  Users,
  Layers,
  Activity,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type ProductInsightsFunnelStage = {
  stage: string;
  count: number;
  conversionFromPrevious: number;
  dropoffRate: number;
};

export type ProductInsightsFeature = {
  featureName: string;
  category: string;
  businessesUsing: number;
  adoptionRate: number;
};

export type ProductInsightsProps = {
  healthScore: {
    score: number;
    rating: string;
    breakdown: {
      activationScore: number;
      retentionScore: number;
      reliabilityScore: number;
      bugSeverityScore: number;
    };
    openCriticalBugs: number;
  };
  funnel: {
    stages: ProductInsightsFunnelStage[];
    totalSignups: number;
    activationRate: number;
  };
  adoption: {
    totalBusinesses: number;
    features: ProductInsightsFeature[];
  };
  retention: {
    activeLast1Day: number;
    activeLast7Days: number;
    activeLast30Days: number;
    day1RetentionRate: number;
    day7RetentionRate: number;
    day30RetentionRate: number;
  };
  reliability: {
    systemReliabilityRate: number;
    failedCheckouts: number;
    syncConflicts: number;
    reportFailures: number;
    commDeliveryFailures: number;
  };
};

const STAGE_KEYS: Record<string, string> = {
  'User Signup': 'productInsights.stageUserSignup',
  'Business Profile Created': 'productInsights.stageBusinessCreated',
  'First Product Added': 'productInsights.stageFirstProduct',
  'First Stock Purchase': 'productInsights.stageFirstPurchase',
  'First POS Sale (Activated)': 'productInsights.stageActivated',
};

const FEATURE_KEYS: Record<string, string> = {
  'POS Counter Billing': 'productInsights.featurePosCounterBilling',
  'Product Catalog & Inventory': 'productInsights.featureProductCatalog',
  'Customer Udhaar (Credit Ledgers)': 'productInsights.featureCustomerUdhaar',
  'Wholesale Purchase Orders': 'productInsights.featureWholesalePurchases',
  'Staff Attendance & Payroll': 'productInsights.featureStaffPayroll',
  'Offline POS Mode': 'productInsights.featureOfflinePos',
  'PWA Mobile App': 'productInsights.featurePwaApp',
  'Remote CCTV Foundation': 'productInsights.featureRemoteCctv',
  'Customer Feedback Portal': 'productInsights.featureFeedbackPortal',
  'External Communication Gateway': 'productInsights.featureCommGateway',
};

const CATEGORY_KEYS: Record<string, string> = {
  'Core Retail': 'productInsights.categoryCoreRetail',
  Finance: 'productInsights.categoryFinance',
  Procurement: 'productInsights.categoryProcurement',
  Operations: 'productInsights.categoryOperations',
  Resilience: 'productInsights.categoryResilience',
  Platform: 'productInsights.categoryPlatform',
  Security: 'productInsights.categorySecurity',
  'Customer Care': 'productInsights.categoryCustomerCare',
  Messaging: 'productInsights.categoryMessaging',
};

const RATING_KEYS: Record<string, string> = {
  EXCELLENT: 'productInsights.ratingExcellent',
  GOOD: 'productInsights.ratingGood',
  NEEDS_ATTENTION: 'productInsights.ratingNeedsAttention',
};

export function ProductInsightsPageClient({
  healthScore,
  funnel,
  adoption,
  retention,
  reliability,
}: ProductInsightsProps) {
  const { t, formatNumber } = useTranslation();

  const translateWithMap = (map: Record<string, string>, value: string): string =>
    map[value] ? t(map[value]) : value;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-soft text-gray-950 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>{t('productInsights.chip')}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('productInsights.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {t('productInsights.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/product-feedback"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4 text-gray-900" />
            {t('productInsights.feedbackButton')}
          </Link>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-700 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              {t('productInsights.scoreEyebrow')}
            </span>
            <h2 className="text-2xl font-bold">{t('productInsights.scoreTitle')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-end">
              <span className="text-3xl font-black text-white">{healthScore.score}</span>
              <span className="text-gray-400 text-sm">{t('productInsights.scoreSuffix')}</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              healthScore.rating === 'EXCELLENT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : healthScore.rating === 'GOOD'
                ? 'bg-primary-soft0/20 text-blue-300 border border-blue-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {translateWithMap(RATING_KEYS, healthScore.rating)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 space-y-1">
            <span className="text-gray-400">{t('productInsights.activationWeight')}</span>
            <div className="text-base font-bold text-white">
              {t('productInsights.weightOutOf', { value: healthScore.breakdown.activationScore, max: 30 })}
            </div>
            <span className="text-[10px] text-gray-500">{t('productInsights.activationWeightHint')}</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 space-y-1">
            <span className="text-gray-400">{t('productInsights.retentionWeight')}</span>
            <div className="text-base font-bold text-white">
              {t('productInsights.weightOutOf', { value: healthScore.breakdown.retentionScore, max: 25 })}
            </div>
            <span className="text-[10px] text-gray-500">{t('productInsights.retentionWeightHint')}</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 space-y-1">
            <span className="text-gray-400">{t('productInsights.reliabilityWeight')}</span>
            <div className="text-base font-bold text-white">
              {t('productInsights.weightOutOf', { value: healthScore.breakdown.reliabilityScore, max: 25 })}
            </div>
            <span className="text-[10px] text-gray-500">
              {t('productInsights.reliabilityWeightHint', { rate: reliability.systemReliabilityRate })}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 space-y-1">
            <span className="text-gray-400">{t('productInsights.bugWeight')}</span>
            <div className="text-base font-bold text-white">
              {t('productInsights.weightOutOf', { value: healthScore.breakdown.bugSeverityScore, max: 20 })}
            </div>
            <span className="text-[10px] text-gray-500">
              {t('productInsights.bugWeightHint', { count: healthScore.openCriticalBugs })}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-900 rtl-flip" />
              {t('productInsights.funnelTitle')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('productInsights.funnelDescription')}
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-soft text-gray-900 border border-blue-200">
            {t('productInsights.activationRate')} <span className="font-bold">{funnel.activationRate}%</span>
          </div>
        </div>

        <div className="space-y-4">
          {funnel.stages.map((stage, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-gray-950 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  {translateWithMap(STAGE_KEYS, stage.stage)}
                </span>
                <span className="text-gray-900 font-bold">
                  {t('productInsights.storesCount', { count: formatNumber(stage.count) })}{' '}
                  {idx > 0 && (
                    <span className="text-gray-400 font-normal">
                      {t('productInsights.conversionNote', { pct: stage.conversionFromPrevious })}
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${funnel.totalSignups > 0 ? (stage.count / funnel.totalSignups) * 100 : 0}%`,
                  }}
                />
              </div>
              {stage.dropoffRate > 0 && (
                <p className="text-[10px] text-amber-600 text-end">
                  {t('productInsights.dropoffNote', { pct: stage.dropoffRate })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <div className="border-b pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-900" />
              {t('productInsights.adoptionTitle')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('productInsights.adoptionDescription', { count: formatNumber(adoption.totalBusinesses) })}
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {adoption.features.map((feat, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-gray-900">{translateWithMap(FEATURE_KEYS, feat.featureName)}</div>
                  <div className="text-gray-400 text-[11px]">{translateWithMap(CATEGORY_KEYS, feat.category)}</div>
                </div>
                <div className="text-end space-y-1">
                  <span className="font-bold text-gray-900">{feat.adoptionRate}%</span>
                  <div className="text-[10px] text-gray-400">
                    {t('productInsights.storesCount', { count: formatNumber(feat.businessesUsing) })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-3">
              <Users className="w-4 h-4 text-gray-900" /> {t('productInsights.retentionTitle')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600">{t('productInsights.day1Active')}</span>
                <span className="font-bold text-gray-900">
                  {t('productInsights.retentionValue', { rate: retention.day1RetentionRate, count: formatNumber(retention.activeLast1Day) })}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600">{t('productInsights.day7Active')}</span>
                <span className="font-bold text-gray-900">
                  {t('productInsights.retentionValue', { rate: retention.day7RetentionRate, count: formatNumber(retention.activeLast7Days) })}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600">{t('productInsights.day30Active')}</span>
                <span className="font-bold text-gray-900">
                  {t('productInsights.retentionValue', { rate: retention.day30RetentionRate, count: formatNumber(retention.activeLast30Days) })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> {t('productInsights.reliabilityTitle')}
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('productInsights.posCheckoutErrors')}</span>
                <span className="font-semibold text-gray-900">{formatNumber(reliability.failedCheckouts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('productInsights.offlineSyncConflicts')}</span>
                <span className="font-semibold text-gray-900">{formatNumber(reliability.syncConflicts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('productInsights.reportQueryErrors')}</span>
                <span className="font-semibold text-gray-900">{formatNumber(reliability.reportFailures)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('productInsights.commDeliveryFailures')}</span>
                <span className="font-semibold text-gray-900">{formatNumber(reliability.commDeliveryFailures)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
