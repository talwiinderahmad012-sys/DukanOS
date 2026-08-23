import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | DukaanOS',
  description: 'Terms and conditions governing the use of DukaanOS retail and business management software.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to DukaanOS</span>
          </Link>
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>DukaanOS Terms of Service</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 space-y-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
              Effective Date: August 2026
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Terms of Service</h1>
            <p className="text-gray-600 mt-2">
              Please read these Terms of Service carefully before using the DukaanOS platform. By creating an account or accessing our software, you agree to abide by these terms.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" /> 1. Account Responsibility & Security
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your business account. Store owners must ensure that staff members are assigned appropriate authorization roles (e.g. Cashier, Manager) and that compromised accounts are promptly deactivated.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" /> 2. Acceptable Use
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              DukaanOS is designed to facilitate lawful retail commerce, point-of-sale operations, inventory management, and customer relations. You agree not to use the platform for unlawful financial schemes, malicious security probing, or attempting to circumvent multi-tenant access controls.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600" /> 3. Service Availability & Offline Operations
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              While DukaanOS provides offline-aware POS capabilities that allow sales to be queued locally on your browser during temporary network outages, the central server remains the authoritative source of truth upon reconnection. DukaanOS is provided on an &ldquo;as is&rdquo; basis without warranties of uninterrupted uptime during third-party internet or hosting outages.
            </p>
          </section>

          {/* Footer Note */}
          <div className="pt-6 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
            <span>DukaanOS — Terms of Service</span>
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
