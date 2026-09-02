'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Download, Server } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { ConnectionBanner } from '@/components/pwa/pwa-provider';

export default function PrivacyPage() {
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
            <Shield className="w-5 h-5 text-gray-900" />
            <span>{t('staticPages.privacyHeader')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 space-y-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-900 bg-primary-soft px-2.5 py-1 rounded">
              {t('staticPages.effectiveDateAug2026')}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">{t('staticPages.privacyTitle')}</h1>
            <p className="text-gray-600 mt-2">
              {t('staticPages.privacyIntro')}
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-900" /> {t('staticPages.privacyS1Title')}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('staticPages.privacyS1Body')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-900" /> {t('staticPages.privacyS2Title')}
            </h2>
            <ul className="list-disc ps-5 text-sm text-gray-600 space-y-2">
              <li><strong>{t('staticPages.privacyS2Item1Label')}</strong> {t('staticPages.privacyS2Item1Text')}</li>
              <li><strong>{t('staticPages.privacyS2Item2Label')}</strong> {t('staticPages.privacyS2Item2Text')}</li>
              <li><strong>{t('staticPages.privacyS2Item3Label')}</strong> {t('staticPages.privacyS2Item3Text')}</li>
              <li><strong>{t('staticPages.privacyS2Item4Label')}</strong> {t('staticPages.privacyS2Item4Text')}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-900" /> {t('staticPages.privacyS3Title')}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('staticPages.privacyS3Body')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-900" /> {t('staticPages.privacyS4Title')}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('staticPages.privacyS4Body')}
            </p>
          </section>

          <div className="pt-6 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
            <span>{t('staticPages.privacyFooter')}</span>
            <Link href="/terms" className="text-gray-900 hover:underline">
              {t('staticPages.termsOfServiceLink')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
