import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Download, Server } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | DukaanOS',
  description: 'Learn how DukaanOS protects your business, customer, and financial data with tenant isolation and strict privacy safeguards.',
};

export default function PrivacyPage() {
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
            <Shield className="w-5 h-5 text-blue-600" />
            <span>DukaanOS Privacy Policy</span>
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
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Privacy & Data Protection</h1>
            <p className="text-gray-600 mt-2">
              At DukaanOS, we believe your business data belongs entirely to you. This Privacy Policy transparently explains what data we process, why we need it, and how your privacy is protected.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" /> 1. Business Data Isolation & Ownership
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Every business registered on DukaanOS operates in a strictly isolated tenant environment. Your sales numbers, inventory levels, customer names, employee records, and profit margins are completely inaccessible to other store owners. We never monetize, sell, or aggregate your proprietary transaction data for third-party advertising.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" /> 2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
              <li><strong>Account Credentials:</strong> Name, business name, phone number, and securely hashed passwords (Bcrypt salt rounds 10).</li>
              <li><strong>Store Operations Data:</strong> Product catalog details, supplier purchase records, POS transaction invoices, and customer credit ledger balances.</li>
              <li><strong>Staff Records:</strong> Employee rosters, daily attendance logs, and salary payment records entered by authorized store managers.</li>
              <li><strong>Technical Diagnostics:</strong> IP addresses and system error digests recorded exclusively for security rate limiting and crash debugging.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" /> 3. Security & Access Control
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              All client-server communications use modern TLS/HTTPS encryption. Sensitive credentials such as passwords, external API tokens, and local CCTV camera URLs are automatically redacted from server logs. DukaanOS enforces strict role-based access control (Owner, Manager, Cashier, Employee) ensuring staff can only access features permitted by their assigned role.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" /> 4. Data Portability & Export Rights
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              You retain 100% data portability. Business owners can export complete store records (Products, Customers, Invoices, Udhaar Ledgers, Purchases) in standardized JSON and CSV formats at any time via the Settings $\rightarrow$ Data Export portal.
            </p>
          </section>

          {/* Footer Note */}
          <div className="pt-6 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
            <span>DukaanOS — Built for Small Retail Businesses</span>
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
