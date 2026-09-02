'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Store,
  Package,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Sparkles,
  UserCheck,
  WifiOff,
  CheckCircle2
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { ConnectionBanner } from '@/components/pwa/pwa-provider';

export default function DocsPage() {
  const { t } = useTranslation();

  const sections = [
    {
      icon: Store,
      title: t('staticPages.docsS1Title'),
      desc: t('staticPages.docsS1Desc'),
      steps: [
        t('staticPages.docsS1Step1'),
        t('staticPages.docsS1Step2'),
        t('staticPages.docsS1Step3'),
      ],
    },
    {
      icon: Package,
      title: t('staticPages.docsS2Title'),
      desc: t('staticPages.docsS2Desc'),
      steps: [
        t('staticPages.docsS2Step1'),
        t('staticPages.docsS2Step2'),
        t('staticPages.docsS2Step3'),
      ],
    },
    {
      icon: ShoppingCart,
      title: t('staticPages.docsS3Title'),
      desc: t('staticPages.docsS3Desc'),
      steps: [
        t('staticPages.docsS3Step1'),
        t('staticPages.docsS3Step2'),
        t('staticPages.docsS3Step3'),
        t('staticPages.docsS3Step4'),
      ],
    },
    {
      icon: CreditCard,
      title: t('staticPages.docsS4Title'),
      desc: t('staticPages.docsS4Desc'),
      steps: [
        t('staticPages.docsS4Step1'),
        t('staticPages.docsS4Step2'),
        t('staticPages.docsS4Step3'),
      ],
    },
    {
      icon: TrendingUp,
      title: t('staticPages.docsS5Title'),
      desc: t('staticPages.docsS5Desc'),
      steps: [
        t('staticPages.docsS5Step1'),
        t('staticPages.docsS5Step2'),
        t('staticPages.docsS5Step3'),
      ],
    },
    {
      icon: Sparkles,
      title: t('staticPages.docsS6Title'),
      desc: t('staticPages.docsS6Desc'),
      steps: [
        t('staticPages.docsS6Step1'),
        t('staticPages.docsS6Step2'),
        t('staticPages.docsS6Step3'),
      ],
    },
    {
      icon: UserCheck,
      title: t('staticPages.docsS7Title'),
      desc: t('staticPages.docsS7Desc'),
      steps: [
        t('staticPages.docsS7Step1'),
        t('staticPages.docsS7Step2'),
        t('staticPages.docsS7Step3'),
      ],
    },
    {
      icon: WifiOff,
      title: t('staticPages.docsS8Title'),
      desc: t('staticPages.docsS8Desc'),
      steps: [
        t('staticPages.docsS8Step1'),
        t('staticPages.docsS8Step2'),
        t('staticPages.docsS8Step3'),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
        <ConnectionBanner />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl-flip" />
            <span className="text-sm font-medium">{t('staticPages.backToDukaanOS')}</span>
          </Link>
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <BookOpen className="w-5 h-5 text-gray-900" />
            <span>{t('staticPages.docsHandbookHeader')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('staticPages.docsMainTitle')}</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {t('staticPages.docsIntro')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-soft text-gray-900 flex items-center justify-center shrink-0">
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-900 shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-primary text-on-primary rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <h2 className="text-2xl font-bold">{t('staticPages.docsCtaTitle')}</h2>
          <p className="text-blue-100 text-sm max-w-lg mx-auto">
            {t('staticPages.docsCtaText')}
          </p>
          <div>
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-900 font-semibold text-sm rounded-lg hover:bg-primary-soft transition-colors shadow"
            >
              {t('staticPages.docsCtaButton')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
