'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Layers,
  Gift,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

const STATUS_KEYS: Record<string, string> = {
  ACTIVE: 'settingsAdmin.plan.statusActive',
  TRIALING: 'settingsAdmin.plan.statusTrialing',
  PAST_DUE: 'settingsAdmin.plan.statusPastDue',
  CANCELLED: 'settingsAdmin.plan.statusCancelled',
  EXPIRED: 'settingsAdmin.plan.statusExpired',
};

const FEATURE_LABEL_KEYS: Record<string, string> = {
  POS: 'settingsAdmin.plan.featurePos',
  INVENTORY: 'settingsAdmin.plan.featureInventory',
  PURCHASES: 'settingsAdmin.plan.featurePurchases',
  CUSTOMERS: 'settingsAdmin.plan.featureCustomers',
  UDHAAR: 'settingsAdmin.plan.featureUdhaar',
  REPORTS: 'settingsAdmin.plan.featureReports',
  BUSINESS_ADVISOR: 'settingsAdmin.plan.featureAdvisor',
  EMPLOYEES: 'settingsAdmin.plan.featureEmployees',
  OFFLINE_POS: 'settingsAdmin.plan.featureOfflinePos',
  PWA: 'settingsAdmin.plan.featurePwa',
  WEB_PUSH: 'settingsAdmin.plan.featureWebPush',
  MULTI_BRANCH: 'settingsAdmin.plan.featureMultiBranch',
  MULTI_BUSINESS: 'settingsAdmin.plan.featureMultiBusiness',
  CCTV: 'settingsAdmin.plan.featureCctv',
  EXTERNAL_COMMUNICATION: 'settingsAdmin.plan.featureExternalCommunication',
  DATA_EXPORT: 'settingsAdmin.plan.featureDataExport',
  ADVANCED_ANALYTICS: 'settingsAdmin.plan.featureAdvancedAnalytics',
};

const PLAN_DESCRIPTION_KEYS: Record<string, string> = {
  FREE: 'settingsAdmin.plan.freePlanDescription',
};

export function PlanView({
  businessName,
  planCode,
  planName,
  planDescription,
  subscriptionStatus,
  features,
}: {
  businessName: string;
  planCode: string;
  planName: string;
  planDescription: string | null;
  subscriptionStatus: string;
  features: string[];
}) {
  const { t } = useTranslation();

  const statusLabel = (status: string) => t(STATUS_KEYS[status] ?? 'common.unknown', status);
  const featureLabel = (key: string) => t(FEATURE_LABEL_KEYS[key] ?? 'common.unknown', key);
  const resolvedPlanName =
    planCode === 'FREE' ? t('settingsAdmin.plan.freePlanName') : planName;
  const resolvedPlanDescription =
    (PLAN_DESCRIPTION_KEYS[planCode]
      ? t(PLAN_DESCRIPTION_KEYS[planCode])
      : planDescription) || t('settingsAdmin.plan.defaultPlanDescription');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b pb-4 space-y-2">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl-flip" /> {t('settingsAdmin.backToSettings')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="w-6 h-6 text-gray-900" />
          {t('settingsAdmin.plan.title')}
        </h1>
        <p className="text-gray-500 text-sm">
          {t('settingsAdmin.plan.description', { business: businessName })}
        </p>
      </div>

      {/* Active Plan Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-800/80 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              {t('settingsAdmin.plan.activeTier')}
            </span>
            <h2 className="text-3xl font-black">{resolvedPlanName}</h2>
            <p className="text-xs text-blue-200 mt-1 max-w-lg">
              {resolvedPlanDescription}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              {t('settingsAdmin.plan.statusLabel', { status: statusLabel(subscriptionStatus) })}
            </span>
          </div>
        </div>

        {/* Free Plan Assurance Note */}
        <div className="p-4 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-start gap-3 text-xs text-blue-100">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">{t('settingsAdmin.plan.freeFirstTitle')}</span>
            {t('settingsAdmin.plan.freeFirstBody')}
          </div>
        </div>
      </div>

      {/* Included Features List */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-900" />
              {t('settingsAdmin.plan.includedTitle')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('settingsAdmin.plan.includedDescription', { plan: resolvedPlanName })}
            </p>
          </div>
          <Link
            href="/dashboard/settings/usage"
            className="text-xs text-gray-900 hover:underline font-semibold"
          >
            {t('settingsAdmin.plan.viewUsage')}{' '}
            <span className="inline-block rtl-flip" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {features.map((featKey) => (
            <div
              key={featKey}
              className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900">
                  {featureLabel(featKey)}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  {t('settingsAdmin.plan.featureEnabled', { flag: featKey })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
