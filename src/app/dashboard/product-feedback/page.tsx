import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { 
  getProductFeedbackOverview, 
  listBugReports, 
  listProductFeedbacks 
} from '@/services/product-feedback';
import { BugTriagePanel } from '@/components/feedback/bug-triage-panel';
import { 
  Bug, 
  Lightbulb, 
  Star, 
  ShieldAlert, 
  CheckCircle2, 
  Activity,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Feedback & Bug Triage | DukaanOS',
  description: 'Manage user-reported bugs, platform satisfaction reviews, and feature requests.',
};

export default async function ProductFeedbackPage() {
  const { user, business } = await getActiveBusiness();

  const [overview, bugs, features] = await Promise.all([
    getProductFeedbackOverview(),
    listBugReports(),
    listProductFeedbacks(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Continuous Improvement & Triage</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback & Bug Triage Hub</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review user-reported defects, prioritize roadmap requests, and track satisfaction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/product-insights"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-sm"
          >
            <Activity className="w-4 h-4 text-blue-600" />
            Usage Analytics
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Bug Stats */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Bug Reports</span>
            <Bug className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overview.bugs.open} Open</div>
          <div className="flex items-center gap-2 text-[11px]">
            {overview.bugs.p0 > 0 ? (
              <span className="text-red-600 font-bold">{overview.bugs.p0} Critical (P0)</span>
            ) : (
              <span className="text-emerald-600 font-medium">0 P0 Blockers</span>
            )}
            <span className="text-gray-300">&bull;</span>
            <span className="text-gray-500">{overview.bugs.resolved} Resolved</span>
          </div>
        </div>

        {/* User Satisfaction */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>User Satisfaction</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {overview.satisfaction.total > 0
              ? `${Math.round((overview.satisfaction.great / overview.satisfaction.total) * 100)}% Positive`
              : 'No Reviews'}
          </div>
          <div className="text-[11px] text-gray-500">
            {overview.satisfaction.great} Great &bull; {overview.satisfaction.okay} Okay &bull; {overview.satisfaction.needsImprovement} Needs Work
          </div>
        </div>

        {/* Feature Requests */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Roadmap Ideas</span>
            <Lightbulb className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overview.featureRequests.total} Submitted</div>
          <div className="text-[11px] text-gray-500">
            {overview.featureRequests.planned} Planned &bull; {overview.featureRequests.shipped} Shipped
          </div>
        </div>
      </div>

      {/* Main Triage Interactive Panel */}
      <BugTriagePanel
        initialBugs={bugs as any}
        initialFeatures={features as any}
      />
    </div>
  );
}
