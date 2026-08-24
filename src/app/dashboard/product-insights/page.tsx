import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { 
  getActivationFunnelMetrics, 
  getFeatureAdoptionMetrics, 
  getUserRetentionMetrics, 
  getReliabilityMetrics, 
  getProductHealthScore 
} from '@/services/product-analytics';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Users, 
  Layers, 
  Activity, 
  Zap, 
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Insights & Usage Telemetry | DukaanOS',
  description: 'Aggregate product analytics, activation funnel, feature adoption, and system reliability metrics.',
};

export default async function ProductInsightsPage() {
  const { user, business, membership } = await getActiveBusiness();

  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  // Load analytics metrics concurrently
  const [
    funnel,
    adoption,
    retention,
    reliability,
    healthScore,
  ] = await Promise.all([
    getActivationFunnelMetrics(),
    getFeatureAdoptionMetrics(),
    getUserRetentionMetrics(),
    getReliabilityMetrics(),
    getProductHealthScore(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>Telemetry & Product Health</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Product Usage & Insights</h1>
          <p className="text-gray-500 text-sm mt-1">
            Privacy-first usage metrics, user activation funnels, and system reliability indicators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/product-feedback"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            Bug Triage & Feedback
          </Link>
        </div>
      </div>

      {/* Product Health Score Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-700 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Composite Reliability & Growth Score
            </span>
            <h2 className="text-2xl font-bold">Product Health Score</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-3xl font-black text-white">{healthScore.score}</span>
              <span className="text-gray-400 text-sm">/100</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              healthScore.rating === 'EXCELLENT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : healthScore.rating === 'GOOD'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {healthScore.rating}
            </div>
          </div>
        </div>

        {/* Health Score Sub-weights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 space-y-1">
            <span className="text-gray-400">Activation Weight</span>
            <div className="text-base font-bold text-white">{healthScore.breakdown.activationScore} / 30</div>
            <span className="text-[10px] text-gray-500">Signups to 1st sale</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 space-y-1">
            <span className="text-gray-400">7-Day Retention</span>
            <div className="text-base font-bold text-white">{healthScore.breakdown.retentionScore} / 25</div>
            <span className="text-[10px] text-gray-500">Active store activities</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 space-y-1">
            <span className="text-gray-400">Reliability Rate</span>
            <div className="text-base font-bold text-white">{healthScore.breakdown.reliabilityScore} / 25</div>
            <span className="text-[10px] text-gray-500">{reliability.systemReliabilityRate}% successful ops</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 space-y-1">
            <span className="text-gray-400">Bug Health</span>
            <div className="text-base font-bold text-white">{healthScore.breakdown.bugSeverityScore} / 20</div>
            <span className="text-[10px] text-gray-500">{healthScore.openCriticalBugs} open P0/P1 bugs</span>
          </div>
        </div>
      </div>

      {/* Activation Funnel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Store Activation Funnel
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tracking journey from visitor registration to first verified POS transaction.
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
            Activation Rate: <span className="font-bold">{funnel.activationRate}%</span>
          </div>
        </div>

        <div className="space-y-4">
          {funnel.stages.map((stage, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  {stage.stage}
                </span>
                <span className="text-gray-900 font-bold">
                  {stage.count} stores {idx > 0 && <span className="text-gray-400 font-normal">({stage.conversionFromPrevious}% conv.)</span>}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${funnel.totalSignups > 0 ? (stage.count / funnel.totalSignups) * 100 : 0}%`,
                  }}
                />
              </div>
              {stage.dropoffRate > 0 && (
                <p className="text-[10px] text-amber-600 text-right">
                  Drop-off: {stage.dropoffRate}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feature Adoption Matrix & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Adoption */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <div className="border-b pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Module & Feature Adoption
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Aggregate store adoption across core modules ({adoption.totalBusinesses} total stores).
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {adoption.features.map((feat, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-gray-900">{feat.featureName}</div>
                  <div className="text-gray-400 text-[11px]">{feat.category}</div>
                </div>
                <div className="text-right space-y-1">
                  <span className="font-bold text-gray-900">{feat.adoptionRate}%</span>
                  <div className="text-[10px] text-gray-400">{feat.businessesUsing} stores</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retention & Operational Reliability */}
        <div className="space-y-6">
          {/* Retention */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-3">
              <Users className="w-4 h-4 text-blue-600" /> Store Activity Retention
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600">Day 1 Active</span>
                <span className="font-bold text-gray-900">{retention.day1RetentionRate}% ({retention.activeLast1Day})</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600">Day 7 Active</span>
                <span className="font-bold text-gray-900">{retention.day7RetentionRate}% ({retention.activeLast7Days})</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600">Day 30 Active</span>
                <span className="font-bold text-gray-900">{retention.day30RetentionRate}% ({retention.activeLast30Days})</span>
              </div>
            </div>
          </div>

          {/* Reliability */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Failure & Error Diagnostics
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">POS Checkout Errors</span>
                <span className="font-semibold text-gray-900">{reliability.failedCheckouts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Offline Sync Conflicts</span>
                <span className="font-semibold text-gray-900">{reliability.syncConflicts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Report Query Errors</span>
                <span className="font-semibold text-gray-900">{reliability.reportFailures}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Comm Delivery Failures</span>
                <span className="font-semibold text-gray-900">{reliability.commDeliveryFailures}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
