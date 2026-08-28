'use client';

import Link from 'next/link';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Package,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { HealthGauge } from '@/components/charts/health-gauge';
import { RefreshAdvisorButton } from '@/components/advisor/refresh-advisor-button';
import { useTranslation } from '@/lib/i18n/language-context';

export type AdvisorFindingView = {
  id: string;
  type:
    | 'OUT_OF_STOCK'
    | 'LOW_STOCK'
    | 'SLOW_MOVING'
    | 'HIGH_DEMAND'
    | 'SALES_DECLINE'
    | 'PROFIT_DECLINE'
    | 'CREDIT_RISK'
    | 'EXPENSE_SPIKE'
    | 'FEEDBACK_SURGE'
    | 'GROWTH_OPPORTUNITY';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO';
  title: string;
  message: string;
  recommendation: string;
  metric?: string;
};

export type AdvisorHealthFactorView = {
  name: string;
  score: number;
  maxScore: number;
  status: 'GOOD' | 'WARNING' | 'ALERT';
  comment: string;
};

export type AdvisorHealthScoreView = {
  score: number;
  grade: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'CRITICAL';
  factors: AdvisorHealthFactorView[];
};

export function AdvisorPageView({
  businessId,
  findings,
  healthScore,
  summaryText,
}: {
  businessId: string;
  findings: AdvisorFindingView[];
  healthScore: AdvisorHealthScoreView;
  summaryText: string;
}) {
  const { t, tm } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{t('advisor.pageTitle')}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-gray-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-gray-900" /> {t('advisor.deterministicAi')}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {t('advisor.subtitle')}
          </p>
        </div>

        <RefreshAdvisorButton businessId={businessId} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-e border-gray-100 pb-6 lg:pb-0 lg:pe-6">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {t('advisor.healthIndex')}
          </span>
          <HealthGauge score={healthScore.score} grade={healthScore.grade} />
          <p className="text-xs text-gray-500 mt-2 text-center max-w-xs leading-relaxed">
            {tm(summaryText)}
          </p>
        </div>

        <div className="lg:col-span-8 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {t('advisor.pillars')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {healthScore.factors.map((factor) => {
              const pct = (factor.score / factor.maxScore) * 100;
              const isAlert = factor.status === 'ALERT';
              const isWarning = factor.status === 'WARNING';

              return (
                <div
                  key={factor.name}
                  className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1.5"
                >
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-800">{tm(factor.name)}</span>
                    <span className={isAlert ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-green-700'}>
                      {factor.score} / {factor.maxScore}
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isAlert ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-gray-500">{tm(factor.comment)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            {t('advisor.findingsHeading', { count: findings.length })}
          </h2>
          <span className="text-xs text-gray-400">{t('advisor.prioritizedBy')}</span>
        </div>

        {findings.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-2">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t('advisor.peakHealthTitle')}</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {t('advisor.peakHealthDescription')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map((finding) => {
              const isCritical = finding.severity === 'CRITICAL';
              const isWarning = finding.severity === 'WARNING';
              const isOpportunity = finding.severity === 'OPPORTUNITY';

              return (
                <div
                  key={finding.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    isCritical
                      ? 'bg-red-50/50 border-red-200'
                      : isWarning
                      ? 'bg-amber-50/50 border-amber-200'
                      : isOpportunity
                      ? 'bg-primary-soft/50 border-blue-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-red-100 text-red-600'
                          : isWarning
                          ? 'bg-amber-100 text-amber-600'
                          : isOpportunity
                          ? 'bg-blue-100 text-gray-900'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isCritical ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isOpportunity ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <Package className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm">{tm(finding.title)}</h4>
                        {finding.metric && (
                          <span className="px-2 py-0.5 bg-white/80 border border-gray-200 text-gray-800 text-[11px] font-bold rounded-md">
                            {tm(finding.metric)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{tm(finding.message)}</p>
                      <div className="pt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                        <span className="text-gray-900">{t('advisor.adviceLabel')}</span>
                        <span>{tm(finding.recommendation)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {finding.type === 'OUT_OF_STOCK' || finding.type === 'LOW_STOCK' ? (
                      <Link
                        href="/dashboard/purchases/new"
                        className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        {t('advisor.orderStock')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
                      </Link>
                    ) : finding.type === 'CREDIT_RISK' ? (
                      <Link
                        href="/dashboard/customers"
                        className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        {t('advisor.collectUdhaar')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
                      </Link>
                    ) : finding.type === 'SLOW_MOVING' ? (
                      <Link
                        href="/dashboard/inventory"
                        className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        {t('advisor.reviewStock')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard/reports/monthly"
                        className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        {t('advisor.viewReport')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
