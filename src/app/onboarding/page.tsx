'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, MapPin, Settings } from 'lucide-react';
import { submitOnboardingAction } from '@/app/actions/onboarding.actions';
import { useTranslation } from '@/lib/i18n/language-context';
import { Select } from '@/components/ui/select';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        <div className="mb-8 border-b pb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('onboarding.setupTitle')}</h1>
          <p className="text-gray-500 mt-1">{t('onboarding.setupSubtitle')}</p>
        </div>

        {(error || serverError) && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error ? t(error) : tm(serverError)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Store className="w-5 h-5 text-gray-900" /> {t('onboarding.businessDetails')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.businessName')}</label>
                <input required name="businessName" type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary" placeholder={t('onboarding.businessNamePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.businessType')}</label>
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

          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-900" /> {t('onboarding.localeAndCurrency')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.currency')}</label>
                <select name="currency" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary">
                  <option value="PKR">{t('onboarding.currencyPkr')}</option>
                  <option value="USD">{t('onboarding.currencyUsd')}</option>
                  <option value="EUR">{t('onboarding.currencyEur')}</option>
                  <option value="GBP">{t('onboarding.currencyGbp')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.timezone')}</label>
                <select name="timezone" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary">
                  <option value="Asia/Karachi">{t('onboarding.timezoneKarachi')}</option>
                  <option value="Asia/Dubai">{t('onboarding.timezoneDubai')}</option>
                  <option value="Europe/London">{t('onboarding.timezoneLondon')}</option>
                  <option value="America/New_York">{t('onboarding.timezoneNewYork')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-900" /> {t('onboarding.firstBranch')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.branchName')}</label>
                <input name="branchName" type="text" defaultValue="Main Branch" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.city')}</label>
                <input name="city" type="text" placeholder={t('onboarding.cityPlaceholder')} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto md:px-8 bg-primary hover:bg-primary-hover text-on-primary font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 float-end"
            >
              {loading ? t('onboarding.creating') : t('onboarding.finishSetup')}
            </button>
            <div className="clear-both"></div>
          </div>
        </form>
      </div>
    </div>
  );
}
