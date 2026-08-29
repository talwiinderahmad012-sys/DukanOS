'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, User, Building, Lock } from 'lucide-react';
import { registerUserAction } from '@/app/actions/auth.actions';
import { signIn } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n/language-context';
import { Select } from '@/components/ui/select';

export default function RegisterPage() {
  const router = useRouter();
  const { t, tm, language, setLanguage } = useTranslation();
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setServerError('');
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const username = formData.get('username') as string;
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await registerUserAction(payload);

      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors as Record<string, string[]>);
        }
        if (res.message) {
          setServerError(res.message);
        } else {
          setError('auth.registrationFailed');
        }
        setLoading(false);
        return;
      }

      const signInRes = await signIn('credentials', {
        redirect: false,
        fullName,
        username,
        email,
        password,
      });

      if (signInRes?.error) {
        router.push('/login');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 py-12">
      <div className="relative max-w-2xl w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
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
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.registerTitle')}</h1>
          <p className="text-gray-500 mt-2 text-sm">{t('auth.registerSubtitle')}</p>
        </div>

        {(error || serverError) && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error ? t(error) : tm(serverError)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 border-b pb-2">
              <User className="w-5 h-5 text-gray-500" />
              {t('common.personalInfo', 'Personal Information')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.firstName')}</label>
                <input name="firstName" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.lastName')}</label>
                <input name="lastName" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.username')}</label>
                <input name="username" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.username && <p className="text-red-500 text-xs mt-1">{fieldErrors.username[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.phone')}</label>
                <input name="phone" type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone[0]}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.emailLabel')}</label>
                <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</p>}
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 border-b pb-2">
              <Building className="w-5 h-5 text-gray-500" />
              {t('onboarding.businessDetails')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.businessName')}</label>
                <input name="businessName" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.businessName && <p className="text-red-500 text-xs mt-1">{fieldErrors.businessName[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.businessType')}</label>
                <Select 
                  name="businessType"
                  required
                  disabled={loading}
                  options={[
                    { label: t('onboarding.typeRetail'), value: 'RETAIL' },
                    { label: t('onboarding.typeWholesale'), value: 'WHOLESALE' },
                    { label: t('onboarding.typeServices'), value: 'SERVICES' },
                    { label: t('onboarding.typeOther'), value: 'OTHER' }
                  ]}
                  value="RETAIL"
                />
                {fieldErrors.businessType && <p className="text-red-500 text-xs mt-1">{fieldErrors.businessType[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.city')}</label>
                <input name="city" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.city && <p className="text-red-500 text-xs mt-1">{fieldErrors.city[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.country')}</label>
                <input name="country" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.country && <p className="text-red-500 text-xs mt-1">{fieldErrors.country[0]}</p>}
              </div>
            </div>
          </div>

          {/* Password Setup */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 border-b pb-2">
              <Lock className="w-5 h-5 text-gray-500" />
              {t('common.security', 'Security')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.passwordLabel')}</label>
                <input name="password" type="password" required minLength={8} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirmPasswordLabel')}</label>
                <input name="confirmPassword" type="password" required minLength={8} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors" disabled={loading} />
                {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword[0]}</p>}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-on-primary font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center text-lg"
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccountButton')}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="text-gray-900 hover:text-gray-800 font-medium">
            {t('auth.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
