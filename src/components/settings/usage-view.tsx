'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Package,
  Users,
  Building2,
  ShoppingCart,
  Video,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

const METRIC_LABEL_KEYS: Record<string, string> = {
  MAX_BRANCHES: 'settingsAdmin.usage.metricBranches',
  MAX_USERS: 'settingsAdmin.usage.metricUsers',
  MAX_PRODUCTS: 'settingsAdmin.usage.metricProducts',
  MAX_CUSTOMERS: 'settingsAdmin.usage.metricCustomers',
  MAX_MONTHLY_SALES: 'settingsAdmin.usage.metricMonthlySales',
  MAX_CCTV_CAMERAS: 'settingsAdmin.usage.metricCctvCameras',
  MAX_EXTERNAL_MESSAGES: 'settingsAdmin.usage.metricExternalMessages',
};

type UsageMetricProp = {
  limitKey: string;
  label: string;
  current: number;
  limit: number;
  remaining: number | null;
  isUnlimited: boolean;
  isBlocked: boolean;
};

export function UsageView({
  businessName,
  planName,
  metrics,
}: {
  businessName: string;
  planName: string;
  metrics: UsageMetricProp[];
}) {
  const { t, formatNumber } = useTranslation();

  const metricIcons: Record<string, any> = {
    MAX_BRANCHES: Building2,
    MAX_USERS: Users,
    MAX_PRODUCTS: Package,
    MAX_CUSTOMERS: Users,
    MAX_MONTHLY_SALES: ShoppingCart,
    MAX_CCTV_CAMERAS: Video,
    MAX_EXTERNAL_MESSAGES: MessageSquare,
  };

  const metricLabel = (metric: UsageMetricProp) =>
    t(METRIC_LABEL_KEYS[metric.limitKey] ?? 'common.unknown', metric.label);
  const resolvedPlanName =
    planName === 'Free Plan' ? t('settingsAdmin.plan.freePlanName') : planName;

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
          <Activity className="w-6 h-6 text-gray-900" />
          {t('settingsAdmin.usage.title')}
        </h1>
        <p className="text-gray-500 text-sm">
          {t('settingsAdmin.usage.description', {
            business: businessName,
            plan: resolvedPlanName,
          })}
        </p>
      </div>

      {/* Usage Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const Icon = metricIcons[metric.limitKey] || Package;
          return (
            <div
              key={metric.limitKey}
              className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-primary-soft text-gray-900 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {metric.isUnlimited
                    ? t('settingsAdmin.usage.unlimitedQuota')
                    : t('settingsAdmin.usage.remaining', { count: metric.remaining ?? 0 })}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-sm">{metricLabel(metric)}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-gray-900">
                    {formatNumber(metric.current)}
                  </span>
                  <span className="text-xs text-gray-400">
                    / {metric.isUnlimited ? t('settingsAdmin.usage.unlimited') : formatNumber(metric.limit)}
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{
                    width: metric.isUnlimited
                      ? `${Math.min(100, Math.max(8, metric.current * 4))}%`
                      : `${Math.min(100, (metric.current / metric.limit) * 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fair Use Assurance Note */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 flex items-start gap-4 text-xs text-gray-600">
        <ShieldCheck className="w-6 h-6 text-gray-900 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-gray-900 text-sm">{t('settingsAdmin.usage.trackingTitle')}</h4>
          <p>
            {t('settingsAdmin.usage.trackingBody')}
          </p>
        </div>
      </div>
    </div>
  );
}
