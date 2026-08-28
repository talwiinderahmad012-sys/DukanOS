'use client';

import { Bug, Lightbulb, Star, ShieldAlert, Activity } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/language-context';
import { BugTriagePanel } from '@/components/feedback/bug-triage-panel';

interface Overview {
  bugs: { open: number; p0: number; resolved: number };
  satisfaction: { total: number; great: number; okay: number; needsImprovement: number };
  featureRequests: { total: number; planned: number; shipped: number };
}

interface ProductFeedbackPageClientProps {
  overview: Overview;
  bugs: unknown[];
  features: unknown[];
}

export function ProductFeedbackPageClient({ overview, bugs, features }: ProductFeedbackPageClientProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{t('product.badge')}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('product.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('product.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/product-insights"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-sm"
          >
            <Activity className="w-4 h-4 text-gray-900" />
            {t('product.usageAnalytics')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{t('product.bugReports')}</span>
            <Bug className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {t('product.openCount', { count: overview.bugs.open })}
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            {overview.bugs.p0 > 0 ? (
              <span className="text-red-600 font-bold">{t('product.criticalCount', { count: overview.bugs.p0 })}</span>
            ) : (
              <span className="text-emerald-600 font-medium">{t('product.zeroP0')}</span>
            )}
            <span className="text-gray-300">&bull;</span>
            <span className="text-gray-500">{t('product.resolvedCount', { count: overview.bugs.resolved })}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{t('product.userSatisfaction')}</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {overview.satisfaction.total > 0
              ? t('product.positivePercent', {
                  percent: Math.round((overview.satisfaction.great / overview.satisfaction.total) * 100),
                })
              : t('product.noReviews')}
          </div>
          <div className="text-[11px] text-gray-500">
            {t('product.satisfactionBreakdown', {
              great: overview.satisfaction.great,
              okay: overview.satisfaction.okay,
              needs: overview.satisfaction.needsImprovement,
            })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{t('product.roadmapIdeas')}</span>
            <Lightbulb className="w-4 h-4 text-gray-900" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {t('product.submittedCount', { count: overview.featureRequests.total })}
          </div>
          <div className="text-[11px] text-gray-500">
            {t('product.roadmapBreakdown', {
              planned: overview.featureRequests.planned,
              shipped: overview.featureRequests.shipped,
            })}
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <BugTriagePanel initialBugs={bugs as any} initialFeatures={features as any} />
    </div>
  );
}
