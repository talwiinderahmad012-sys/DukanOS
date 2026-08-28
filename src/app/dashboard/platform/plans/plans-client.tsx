'use client';

import Link from 'next/link';
import { ShieldCheck, Lock, Gift } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type PlanCardData = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  subscriptionCount: number;
  featureKeys: string[];
};

export function PlansPageClient({
  authorized,
  plans,
}: {
  authorized: boolean;
  plans: PlanCardData[];
}) {
  const { t, tm, formatNumber } = useTranslation();

  if (!authorized) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <Lock className="w-12 h-12 text-amber-500 mx-auto" />
        <h1 className="text-xl font-bold text-gray-900">{t('platform.restrictedTitle')}</h1>
        <p className="text-xs text-gray-500">
          {t('platform.restrictedDescription')}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg"
        >
          {t('platform.returnToDashboard')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-soft text-gray-950 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('platform.chip')}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('platform.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {t('platform.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings/plan"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-sm"
          >
            <Gift className="w-4 h-4 text-gray-900" />
            {t('platform.myStorePlan')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold bg-primary-soft text-gray-950 px-2 py-0.5 rounded border border-blue-100">
                  {t('platform.codeLabel', { code: plan.code })}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {plan.isActive ? t('common.active') : t('common.archived')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                {plan.description ? tm(plan.description) : t('platform.defaultDescription')}
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>{t('platform.subscriptionsLabel')}</span>
                <span className="font-bold text-gray-900">
                  {t('platform.storesCount', { count: formatNumber(plan.subscriptionCount) })}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-gray-700 block">
                  {t('platform.featureFlagsTitle', { count: plan.featureKeys.length })}
                </span>
                <div className="flex flex-wrap gap-1">
                  {plan.featureKeys.slice(0, 6).map((featureKey) => (
                    <span
                      key={featureKey}
                      className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono"
                    >
                      {featureKey}
                    </span>
                  ))}
                  {plan.featureKeys.length > 6 && (
                    <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
                      {t('platform.moreFeatures', { count: plan.featureKeys.length - 6 })}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-gray-700 block">{t('platform.quotaLimitsTitle')}</span>
                <div className="text-[11px] text-gray-500">
                  {t('platform.quotaNotePrefix')} <span className="font-mono font-bold text-emerald-700">{t('platform.unlimitedToken')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
