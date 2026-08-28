'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error('Unhandled Application Error:', error?.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-3xl border border-gray-200/80 shadow-xl">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1 rounded-full">
            {t('staticPages.errorBadge')}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">{t('staticPages.errorTitle')}</h1>
          <p className="text-sm text-gray-500">
            {t('staticPages.errorDescription')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            {t('staticPages.tryAgain')}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            {t('staticPages.returnHome')}
          </Link>
        </div>

        {error?.digest && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-mono">{t('staticPages.incidentId', { id: error.digest })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
