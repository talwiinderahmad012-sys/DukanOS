'use client';

import { useTranslation } from '@/lib/i18n/language-context';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="home-hero flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-gray-900">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          DukaanOS
        </h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto urdu-font">
          {t('staticPages.homeTagline')}
        </p>
        
        <div className="flex justify-center gap-4">
          <a 
            href="/login"
            className="px-6 py-2.5 bg-primary text-on-primary font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            {t('common.signIn')}
          </a>
          <a 
            href="/register"
            className="px-6 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {t('staticPages.homeCreateAccount')}
          </a>
        </div>
        <p className="text-sm text-gray-500 mt-8 border border-gray-200 bg-white p-4 rounded-md">
          {t('staticPages.homeStatusNote')}
        </p>
      </div>
    </main>
  );
}
