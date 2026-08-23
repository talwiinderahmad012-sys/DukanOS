import Link from 'next/link';
import { 
  ArrowLeft, 
  BookOpen, 
  Store, 
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Sparkles, 
  UserCheck, 
  WifiOff, 
  Settings,
  CheckCircle2
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation Handbook | DukaanOS',
  description: 'Owner-friendly user guide and manual for running retail store operations with DukaanOS.',
};

export default function DocsPage() {
  const sections = [
    {
      icon: Store,
      title: '1. Getting Started & Store Setup',
      desc: 'Create your business account, select your currency and timezone, and configure your primary store branch.',
      steps: [
        'Register at /register with your name, store name, and password.',
        'Complete the 1-minute onboarding wizard to set your default branch and currency.',
        'Access your central /dashboard to view sales, profit, and alerts in real time.',
      ],
    },
    {
      icon: Package,
      title: '2. Products & Inventory Management',
      desc: 'Add items, print barcodes, set minimum stock alerts, and track physical counts accurately.',
      steps: [
        'Navigate to Products to add items with SKU, barcode, wholesale purchase cost, and retail selling price.',
        'Set a Low Stock Threshold so DukaanOS alerts you before you run out of essential goods.',
        'Stock updates automatically with every POS sale and supplier purchase shipment.',
      ],
    },
    {
      icon: ShoppingCart,
      title: '3. Point of Sale (POS) Counter',
      desc: 'High-speed counter billing designed for barcode scanners and keyboard shortcuts.',
      steps: [
        'Scan barcodes directly into the POS search bar to instantly add items to the cart.',
        'Choose customer type (Walk-in or registered credit customer) and apply discounts.',
        'Tender sales via Cash, Split Payment, or Credit (Udhaar).',
        'Instantly print 58mm, 80mm thermal receipts or standard A4 invoices.',
      ],
    },
    {
      icon: CreditCard,
      title: '4. Customer Udhaar & Debt Recovery',
      desc: 'Keep complete customer ledgers and recover outstanding credit balances easily.',
      steps: [
        'Credit sales automatically update the customer’s outstanding debt in the ledger.',
        'Go to Customers to see who owes money and view complete transaction history.',
        'Click "Record Payment" when a customer pays cash to reconcile their balance immediately.',
      ],
    },
    {
      icon: TrendingUp,
      title: '5. Financial Reports & Profit Analysis',
      desc: 'Understand gross sales, cost of goods sold (COGS), daily expenses, and true net profit.',
      steps: [
        'View Daily, Weekly, Monthly, and Yearly financial summaries in the Reports portal.',
        'Track realized profit margins per item and identify your most profitable categories.',
        'Filter reports by branch to evaluate multi-outlet retail performance.',
      ],
    },
    {
      icon: Sparkles,
      title: '6. Business Advisor (Actionable Intelligence)',
      desc: 'Automated operational guidance highlighting risks and growth opportunities.',
      steps: [
        'DukaanOS continuously reviews your stock, sales velocity, and credit exposure.',
        'Receive proactive alerts on low-stock items, slow-moving dead inventory, and margin drops.',
        'View evidence-backed recommendations to improve store cash flow.',
      ],
    },
    {
      icon: UserCheck,
      title: '7. Staff Management & Attendance',
      desc: 'Role-based access control and biometric attendance tracking for store employees.',
      steps: [
        'Create staff profiles and assign roles: Manager, Cashier, or Stock Helper.',
        'Log daily attendance (Present, Absent, Late) and track leaves.',
        'Disburse monthly salaries and record transparent payroll ledger entries.',
      ],
    },
    {
      icon: WifiOff,
      title: '8. Offline POS & Automatic Synchronization',
      desc: 'Continue selling even when your internet connection drops during peak store hours.',
      steps: [
        'When network disconnects, DukaanOS switches seamlessly into Offline Mode.',
        'Sales are queued securely on your local device without storing sensitive credentials.',
        'Upon reconnecting, transactions sync idempotently to the server without duplicate billing.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to DukaanOS</span>
          </Link>
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>DukaanOS User Handbook</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Store Owner&apos;s Operations Guide</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Everything you need to know to run your shop, track your cash flow, and manage your team using DukaanOS.
          </p>
        </div>

        {/* Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-base">{sec.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{sec.desc}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-100">
                  {sec.steps.map((st, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="bg-blue-600 text-white rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <h2 className="text-2xl font-bold">Ready to streamline your business?</h2>
          <p className="text-blue-100 text-sm max-w-lg mx-auto">
            Join small business owners managing their retail stores with DukaanOS. Get started in under 2 minutes.
          </p>
          <div>
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold text-sm rounded-lg hover:bg-blue-50 transition-colors shadow"
            >
              Start Free Store Setup
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
