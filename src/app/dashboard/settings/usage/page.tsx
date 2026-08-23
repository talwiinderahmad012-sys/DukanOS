import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getBusinessUsage } from '@/services/billing/limits';
import { 
  Activity, 
  ArrowLeft, 
  CheckCircle2, 
  Package, 
  Users, 
  Building2, 
  ShoppingCart, 
  Video, 
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resource Usage & Limits | DukaanOS',
  description: 'Monitor real-time database resource consumption and operational quotas.',
};

export default async function BusinessUsagePage() {
  const { business } = await getActiveBusiness();
  const usage = await getBusinessUsage(business.id);

  const metricIcons: Record<string, any> = {
    MAX_BRANCHES: Building2,
    MAX_USERS: Users,
    MAX_PRODUCTS: Package,
    MAX_CUSTOMERS: Users,
    MAX_MONTHLY_SALES: ShoppingCart,
    MAX_CCTV_CAMERAS: Video,
    MAX_EXTERNAL_MESSAGES: MessageSquare,
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
          <Activity className="w-6 h-6 text-blue-600" />
          Resource Usage & Quotas
        </h1>
        <p className="text-gray-500 text-sm">
          Live resource counts for {business.name} on the <span className="font-semibold text-gray-800">{usage.planName}</span>.
        </p>
      </div>

      {/* Usage Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {usage.metrics.map((metric) => {
          const Icon = metricIcons[metric.limitKey] || Package;
          return (
            <div
              key={metric.limitKey}
              className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {metric.isUnlimited ? 'Unlimited Quota' : `${metric.remaining} Remaining`}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-sm">{metric.label}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-gray-900">
                    {metric.current.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">
                    / {metric.isUnlimited ? '∞ Unlimited' : metric.limit.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
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
        <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-gray-900 text-sm">Transparent Resource Tracking</h4>
          <p>
            DukaanOS tracks operational counts purely to help store owners understand database utilization and maintain high system performance. Invoices and transactions are computed in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
