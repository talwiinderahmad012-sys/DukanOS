import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listAvailablePlans } from '@/services/billing/plans';
import { STANDARD_FEATURES } from '@/services/billing/features';
import { STANDARD_LIMITS } from '@/services/billing/limits';
import { 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  ArrowLeft, 
  Lock, 
  Sparkles,
  Gift
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Plans & Feature Matrix | DukaanOS Admin',
  description: 'Internal platform plan definitions, feature flags, and standard quota thresholds.',
};

export default async function PlatformPlansPage() {
  const { user, business, membership } = await getActiveBusiness();

  // Access control: Ensure user is OWNER of active business context
  const isAuthorized = membership.role === 'OWNER';

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <Lock className="w-12 h-12 text-amber-500 mx-auto" />
        <h1 className="text-xl font-bold text-gray-900">Platform Admin Access Restricted</h1>
        <p className="text-xs text-gray-500">
          This section is restricted to platform administrators and store owners.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const plans = await listAvailablePlans();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Plans & Entitlements</h1>
          <p className="text-gray-500 text-sm mt-1">
            Standard tier definitions, feature flags, and default quota configuration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings/plan"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-sm"
          >
            <Gift className="w-4 h-4 text-blue-600" />
            My Store Plan
          </Link>
        </div>
      </div>

      {/* Plan Definitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                  CODE: {plan.code}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {plan.isActive ? 'Active' : 'Archived'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                {plan.description || 'Standard plan tier.'}
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>Active Store Subscriptions:</span>
                <span className="font-bold text-gray-900">{plan._count.subscriptions} stores</span>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-gray-700 block">Feature Flags ({plan.features.length})</span>
                <div className="flex flex-wrap gap-1">
                  {plan.features.slice(0, 6).map((f: { id: string; featureKey: string }) => (
                    <span
                      key={f.id}
                      className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono"
                    >
                      {f.featureKey}
                    </span>
                  ))}
                  {plan.features.length > 6 && (
                    <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
                      +{plan.features.length - 6} more
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-gray-700 block">Quota Limits</span>
                <div className="text-[11px] text-gray-500">
                  All standard limits set to <span className="font-mono font-bold text-emerald-700">-1 (Unlimited)</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
