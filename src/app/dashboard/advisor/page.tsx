import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { generateAdvisorFindings } from '@/services/advisor';
import { RefreshAdvisorButton } from '@/components/advisor/refresh-advisor-button';
import { HealthGauge } from '@/components/charts/health-gauge';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  Sparkles, 
  AlertTriangle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  Clock, 
  Users, 
  ArrowRight, 
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  Receipt
} from 'lucide-react';

export default async function AdvisorPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const { findings, healthScore, summaryText } = await generateAdvisorFindings(
    business.id,
    business.timezone
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">DukaanOS Business Advisor</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" /> Deterministic AI
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Real-time automated financial analysis, risk detection, and growth recommendations.
          </p>
        </div>

        <RefreshAdvisorButton businessId={business.id} />
      </div>

      {/* Business Health Scorecard & 5 Pillars */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Health Score Gauge (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100 pb-6 lg:pb-0 lg:pr-6">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Business Health Index
          </span>
          <HealthGauge score={healthScore.score} grade={healthScore.grade} />
          <p className="text-xs text-gray-500 mt-2 text-center max-w-xs leading-relaxed">
            {summaryText}
          </p>
        </div>

        {/* 5 Pillars Breakdown (8 Columns) */}
        <div className="lg:col-span-8 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            5 Strategic Financial Pillars
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
                    <span className="text-gray-800">{factor.name}</span>
                    <span className={isAlert ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-green-700'}>
                      {factor.score} / {factor.maxScore}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isAlert ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-gray-500">{factor.comment}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Actionable Findings & Recommendations */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Actionable Intelligence & Recommendations ({findings.length})
          </h2>
          <span className="text-xs text-gray-400">Prioritized by business risk</span>
        </div>

        {findings.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-2">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Your Store is Operating at Peak Health!</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              No stockouts, severe margin declines, or credit risks detected. Continue processing daily transactions normally.
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
                      ? 'bg-blue-50/50 border-blue-200'
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
                          ? 'bg-blue-100 text-blue-600'
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
                        <h4 className="font-bold text-gray-900 text-sm">{finding.title}</h4>
                        {finding.metric && (
                          <span className="px-2 py-0.5 bg-white/80 border border-gray-200 text-gray-800 text-[11px] font-bold rounded-md">
                            {finding.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{finding.message}</p>
                      <div className="pt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                        <span className="text-blue-600">Advice:</span>
                        <span>{finding.recommendation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Action Button */}
                  <div className="shrink-0 self-end sm:self-center">
                    {finding.type === 'OUT_OF_STOCK' || finding.type === 'LOW_STOCK' ? (
                      <Link
                        href="/dashboard/purchases/new"
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        Order Stock <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : finding.type === 'CREDIT_RISK' ? (
                      <Link
                        href="/dashboard/customers"
                        className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        Collect Udhaar <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : finding.type === 'SLOW_MOVING' ? (
                      <Link
                        href="/dashboard/inventory"
                        className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        Review Stock <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard/reports/monthly"
                        className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        View Report <ArrowRight className="w-3.5 h-3.5" />
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
