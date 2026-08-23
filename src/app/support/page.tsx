import Link from 'next/link';
import { ArrowLeft, HelpCircle, BookOpen, MessageSquare, Zap, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & Support | DukaanOS',
  description: 'Frequently asked questions, getting started guides, and support resources for DukaanOS users.',
};

export default function SupportPage() {
  const faqs = [
    {
      q: 'How do I start using DukaanOS for my shop?',
      a: 'Simply click "Start Free" on the homepage, enter your email and password, and create your business profile. You can start adding products and making sales immediately in under 2 minutes.',
    },
    {
      q: 'Does DukaanOS work when my internet goes down?',
      a: 'Yes! DukaanOS has built-in offline POS support. If your connection drops during a rush, you can continue scanning barcodes and making sales. Once your connection returns, all queued transactions synchronize safely to the server.',
    },
    {
      q: 'How does Customer Udhaar (Credit) tracking work?',
      a: 'When completing a sale on the POS terminal, select a registered customer and choose "Credit" or enter a partial payment amount. The unpaid balance is automatically added to the customer\'s ledger. You can record payments later to reconcile the balance.',
    },
    {
      q: 'Can I use barcode scanners and thermal receipt printers?',
      a: 'Yes! DukaanOS POS supports standard USB/Bluetooth barcode guns (which input directly into the search bar) and provides standard 58mm, 80mm, and A4 printable receipt layouts.',
    },
    {
      q: 'Can multiple cashiers use the system at the same time?',
      a: 'Yes. DukaanOS features atomic database row locks that prevent cashiers from overselling stock during simultaneous checkouts.',
    },
    {
      q: 'Is my store data private and secure?',
      a: 'Absolutely. DukaanOS enforces strict multi-tenant database isolation. Your store inventory, sales, customer ledgers, and profit reports are only accessible to you and your authorized staff.',
    },
  ];

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
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <span>DukaanOS Help & Support</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">How can we help you today?</h1>
          <p className="text-gray-600 max-w-xl mx-auto text-sm">
            Find quick answers to common questions about running your store with DukaanOS, or explore our full documentation handbook.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              Read Documentation Handbook
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Create Free Store
            </Link>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 border-b pb-4">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
