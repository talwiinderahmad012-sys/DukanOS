import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles, CheckCircle2, ArrowLeft, Rocket, Shield, ShoppingCart, Users } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Updates & Changelog | DukaanOS',
  description: 'Recent feature releases, improvements, and system updates for DukaanOS.',
};

export default async function UpdatesPage() {
  const { membership } = await getActiveBusiness();

  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const updates = [
    {
      version: 'v1.0.0 — Official Public Release',
      date: 'August 22, 2026',
      badge: 'Major Release',
      highlights: [
        {
          title: 'All-in-One Retail Management Platform',
          desc: 'Complete point-of-sale checkout, customer Udhaar khata ledgers, inventory tracking, wholesale procurement, and real-time profit analytics.',
          icon: ShoppingCart,
        },
        {
          title: 'Actionable Business Advisor',
          desc: 'Automated warnings on low inventory stockouts, dead capital in slow-moving items, and rising customer credit risks.',
          icon: Sparkles,
        },
        {
          title: 'Offline POS & Resilient Sync',
          desc: 'Keep ringing up sales even when store internet disconnects. Transactions synchronize safely when network reconnects.',
          icon: Rocket,
        },
        {
          title: 'Zero-Trust Tenant Security & Audit Logging',
          desc: 'Strict multi-tenant database isolation, rate-limiting, and immutable security audit logs.',
          icon: Shield,
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            What&apos;s New in DukaanOS
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Stay updated with new features, operational enhancements, and system releases.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {updates.map((update, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900">{update.version}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {update.badge}
                </span>
              </div>
              <span className="text-xs text-gray-400">{update.date}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {update.highlights.map((h, hIdx) => {
                const Icon = h.icon;
                return (
                  <div key={hIdx} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                      <Icon className="w-4 h-4 text-blue-600" />
                      <span>{h.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{h.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
