'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, MapPin, Settings } from 'lucide-react';
import { submitOnboardingAction } from '@/app/actions/onboarding.actions';
import { useTranslation } from '@/lib/i18n/language-context';
import { Select } from '@/components/ui/select';
import { SiteHeader } from '@/components/layout/site-header';

export default function OnboardingPage() {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setServerError('');

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await submitOnboardingAction(payload);
      
      if (!res.success) {
        if (res.message) {
          setServerError(res.message);
        } else {
          setError('onboarding.setupFailed');
        }
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('onboarding.genericError');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-transparent relative">
      <SiteHeader />

      <div className="flex flex-1 items-center justify-center p-4 py-8">
      <div className="max-w-2xl w-full surface-glass rounded-2xl shadow-xl border border-white/60 dark:border-white/15 p-8">
        
        <div className="mb-8 border-b border-black/5 dark:border-white/10 pb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('onboarding.setupTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('onboarding.setupSubtitle')}</p>
        </div>

        {(error || serverError) && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-900/50">
            {error ? t(error) : tm(serverError)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Store className="w-5 h-5 text-primary" /> {t('onboarding.businessDetails')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('onboarding.businessName')}</label>
                <input required name="businessName" type="text" className="w-full px-3.5 py-2 border border-gray-300/80 dark:border-white/15 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors" placeholder={t('onboarding.businessNamePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('onboarding.businessType')}</label>
                <Select 
                  name="businessType"
                  options={[
                    { label: t('onboarding.typeRetail'), value: 'RETAIL' },
                    { label: t('onboarding.typeWholesale'), value: 'WHOLESALE' },
                    { label: t('onboarding.typeServices'), value: 'SERVICES' },
                    { label: t('onboarding.typeOther'), value: 'OTHER' }
                  ]}
                  value="RETAIL"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/10">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Settings className="w-5 h-5 text-primary" /> {t('onboarding.localeAndCurrency')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('onboarding.currency')}</label>
                <select name="currency" className="w-full px-3.5 py-2 border border-gray-300/80 dark:border-white/15 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                  <option value="PKR">{t('onboarding.currencyPkr')}</option>
                  <option value="USD">{t('onboarding.currencyUsd')}</option>
                  <option value="EUR">{t('onboarding.currencyEur')}</option>
                  <option value="GBP">{t('onboarding.currencyGbp')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('onboarding.timezone')}</label>
                <select name="timezone" className="w-full px-3.5 py-2 border border-gray-300/80 dark:border-white/15 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                  <option value="Asia/Karachi">{t('onboarding.timezoneKarachi')}</option>
                  <option value="Asia/Dubai">{t('onboarding.timezoneDubai')}</option>
                  <option value="Europe/London">{t('onboarding.timezoneLondon')}</option>
                  <option value="America/New_York">{t('onboarding.timezoneNewYork')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/10">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <MapPin className="w-5 h-5 text-primary" /> {t('onboarding.firstBranch')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('onboarding.branchName')}</label>
                <input name="branchName" type="text" defaultValue="Main Branch" className="w-full px-3.5 py-2 border border-gray-300/80 dark:border-white/15 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.city')}</label>
                <input name="city" type="text" placeholder={t('onboarding.cityPlaceholder')} className="w-full px-3.5 py-2 border border-gray-300/80 dark:border-white/15 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors" />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-black/5 dark:border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto md:px-8 bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-500 hover:to-green-600 text-slate-950 font-bold py-2.5 rounded-xl shadow-md shadow-lime-500/25 transition-all disabled:opacity-50 float-end"
            >
              {loading ? t('onboarding.creating') : t('onboarding.finishSetup')}
            </button>
            <div className="clear-both"></div>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
