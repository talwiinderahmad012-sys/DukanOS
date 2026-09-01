'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export default function LoginPage() {
  const { t, language, setLanguage } = useTranslation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const identifier = (formData.get('identifier') as string)?.trim() || '';
    const password = formData.get('password') as string;

    // [AUTH-DEBUG] temporary logging — remove after diagnosing login
    console.log('[AUTH-DEBUG] login submit', { identifier, passwordLength: password?.length });

    try {
      const res = await signIn('credentials', {
        redirect: false,
        identifier,
        password,
      });

      // [AUTH-DEBUG] temporary logging — remove after diagnosing login
      console.log('[AUTH-DEBUG] signIn() result', { ok: !res?.error, error: res?.error ?? null, status: res?.status ?? null, url: res?.url ?? null });

      if (res?.error) {
        if (res.error === 'ServiceUnavailable') {
          setError('common.somethingWentWrong');
        } else if (res.error === 'RateLimited') {
          setError('auth.tooManyAttempts');
        } else {
          setError('auth.invalidCredentials');
        }
        setLoading(false);
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('common.somethingWentWrong');
      setLoading(false);
    }
  };

  const switcherButton = (active: boolean) =>
    `px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
      active
        ? 'bg-primary border-primary text-on-primary'
        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="relative max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div
          className="absolute top-4 end-4 flex items-center gap-1.5"
          role="group"
          aria-label={t('auth.languageGroup')}
        >
          <button
            type="button"
            onClick={() => setLanguage('EN')}
            aria-label={t('auth.switchToEnglish')}
            className={switcherButton(language === 'EN')}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('UR')}
            aria-label={t('auth.switchToUrdu')}
            className={switcherButton(language === 'UR')}
          >
            <span className="urdu-font">اردو</span>
          </button>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <Store className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.signInTitle')}</h1>
          <p className="text-gray-500 mt-2 text-sm">{t('auth.signInSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {t(error)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="identifier">
              {t('auth.identifierLabel')}
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors"
              placeholder={t('auth.identifierPlaceholder')}
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              {t('auth.passwordLabel')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors"
              placeholder={t('auth.passwordPlaceholder')}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-on-primary font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
          >
            {loading ? t('auth.signingIn') : t('auth.signInButton')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-gray-900 hover:text-gray-800 font-medium">
            {t('auth.createAccountLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
