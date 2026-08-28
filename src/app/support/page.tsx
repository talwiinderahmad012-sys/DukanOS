'use client';

import Link from 'next/link';
import { ArrowLeft, HelpCircle, BookOpen, MessageSquare, Zap, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export default function SupportPage() {
  const { t } = useTranslation();

  const faqs = [
    { q: t('staticPages.supportFaq1Q'), a: t('staticPages.supportFaq1A') },
    { q: t('staticPages.supportFaq2Q'), a: t('staticPages.supportFaq2A') },
    { q: t('staticPages.supportFaq3Q'), a: t('staticPages.supportFaq3A') },
    { q: t('staticPages.supportFaq4Q'), a: t('staticPages.supportFaq4A') },
    { q: t('staticPages.supportFaq5Q'), a: t('staticPages.supportFaq5A') },
    { q: t('staticPages.supportFaq6Q'), a: t('staticPages.supportFaq6A') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl-flip" />
            <span className="text-sm font-medium">{t('staticPages.backToDukaanOS')}</span>
          </Link>
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <HelpCircle className="w-5 h-5 text-gray-900" />
            <span>{t('staticPages.supportHeader')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-primary-soft text-gray-900 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('staticPages.supportMainTitle')}</h1>
          <p className="text-gray-600 max-w-xl mx-auto text-sm">
            {t('staticPages.supportIntro')}
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              {t('staticPages.supportReadHandbook')}
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('staticPages.supportCreateStore')}
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 border-b pb-4">
            <MessageSquare className="w-5 h-5 text-gray-900" /> {t('staticPages.supportFaqTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-900 shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed ps-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
