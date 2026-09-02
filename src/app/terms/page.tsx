'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { ConnectionBanner } from '@/components/pwa/pwa-provider';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
        <ConnectionBanner />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl-flip" />
            <span className="text-sm font-medium">{t('staticPages.backToDukaanOS')}</span>
          </Link>
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <FileText className="w-5 h-5 text-gray-900" />
            <span>{t('staticPages.termsHeader')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 space-y-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-900 bg-primary-soft px-2.5 py-1 rounded">
              {t('staticPages.effectiveDateAug2026')}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">{t('staticPages.termsTitle')}</h1>
            <p className="text-gray-600 mt-2">
              {t('staticPages.termsIntro')}
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gray-900" /> {t('staticPages.termsS1Title')}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('staticPages.termsS1Body')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-gray-900" /> {t('staticPages.termsS2Title')}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('staticPages.termsS2Body')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-gray-900" /> {t('staticPages.termsS3Title')}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('staticPages.termsS3Body')}
            </p>
          </section>

          <div className="pt-6 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
            <span>{t('staticPages.termsFooter')}</span>
            <Link href="/privacy" className="text-gray-900 hover:underline">
              {t('staticPages.privacyPolicyLink')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
