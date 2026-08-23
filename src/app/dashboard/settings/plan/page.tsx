import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getBusinessSubscription } from '@/services/billing/plans';
import { STANDARD_FEATURES } from '@/services/billing/features';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowLeft, 
  ShieldCheck, 
  Layers, 
  Gift, 
  Info 
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plan & Subscription | DukaanOS',
  description: 'View your store plan entitlements, active tier, and core retail capabilities.',
};

export default async function BusinessPlanPage() {
  const { business } = await getActiveBusiness();
  const { plan, subscription } = await getBusinessSubscription(business.id);

  const featureLabels: Record<string, string> = {
    POS: 'Point of Sale (POS) Counter Billing',
    INVENTORY: 'Product Catalog & Stock Management',
    PURCHASES: 'Wholesale Supplier Purchase Orders',
    CUSTOMERS: 'Regular Customer Profiles & Khata',
    UDHAAR: 'Customer Credit & Debt Recovery Ledgers',
    REPORTS: 'Financial P&L Reports & Analytics',
    BUSINESS_ADVISOR: 'Automated Business Advisor Intelligence',
    EMPLOYEES: 'Staff Attendance & Salary Disbursement',
    OFFLINE_POS: 'Offline POS Counter & Safe Sync',
    PWA: 'Progressive Web App (Mobile/Desktop)',
    WEB_PUSH: 'In-App & Web Push Notifications',
    MULTI_BRANCH: 'Multi-Branch Store Outlets',
    MULTI_BUSINESS: 'Multiple Store Ownership Contexts',
    CCTV: 'Remote CCTV Camera Integration',
    EXTERNAL_COMMUNICATION: 'WhatsApp & SMS Gateway',
    DATA_EXPORT: 'Full Store Data Portability (JSON/CSV)',
    ADVANCED_ANALYTICS: 'Growth & Cohort Analytics',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b pb-4 space-y-2">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="w-6 h-6 text-blue-600" />
          Plan & Entitlements
        </h1>
        <p className="text-gray-500 text-sm">
          Overview of your active subscription plan and standard retail capabilities for {business.name}.
        </p>
      </div>

      {/* Active Plan Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-800/80 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Active Tier
            </span>
            <h2 className="text-3xl font-black">{plan.name}</h2>
            <p className="text-xs text-blue-200 mt-1 max-w-lg">
              {plan.description || 'Full core retail management suite enabled for your store.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Status: {subscription.status}</span>
          </div>
        </div>

        {/* Free Plan Assurance Note */}
        <div className="p-4 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-start gap-3 text-xs text-blue-100">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Free-First Commitment</span>
            DukaanOS provides full core retail features for free. No credit card is required, and no hidden expiry limits are imposed on your operational catalog.
          </div>
        </div>
      </div>

      {/* Included Features List */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Included Core Capabilities
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Features active on your current {plan.name}.
            </p>
          </div>
          <Link
            href="/dashboard/settings/usage"
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            View Resource Usage &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {STANDARD_FEATURES.map((featKey) => (
            <div
              key={featKey}
              className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900">
                  {featureLabels[featKey] || featKey}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  FLAG: {featKey} &bull; Enabled
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
