'use client';

import Link from 'next/link';
import { Sparkles, ArrowLeft, Rocket, Shield, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export function UpdatesPageClient() {
  const { t } = useTranslation();

  const highlights: { titleKey: string; descKey: string; icon: LucideIcon }[] = [
    { titleKey: 'updates.h1Title', descKey: 'updates.h1Desc', icon: ShoppingCart },
    { titleKey: 'updates.h2Title', descKey: 'updates.h2Desc', icon: Sparkles },
    { titleKey: 'updates.h3Title', descKey: 'updates.h3Desc', icon: Rocket },
    { titleKey: 'updates.h4Title', descKey: 'updates.h4Desc', icon: Shield },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl-flip" /> {t('updates.backToDashboard')}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gray-900" />
            {t('updates.title')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {t('updates.subtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-900">{t('updates.releaseVersion')}</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-soft text-gray-950 border border-blue-200">
                {t('updates.majorReleaseBadge')}
              </span>
            </div>
            <span className="text-xs text-gray-400">{t('updates.releaseDate')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highlights.map((h, hIdx) => {
              const Icon = h.icon;
              return (
                <div key={hIdx} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                    <Icon className="w-4 h-4 text-gray-900" />
                    <span>{t(h.titleKey)}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{t(h.descKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
