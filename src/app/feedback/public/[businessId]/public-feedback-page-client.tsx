'use client';

import { PublicFeedbackSubmitForm } from '@/components/feedback/public-feedback-submit-form';
import { useTranslation } from '@/lib/i18n/language-context';

interface PublicFeedbackPageClientProps {
  available: boolean;
  businessId?: string;
  businessName?: string;
}

export function PublicFeedbackPageClient({ available, businessId, businessName }: PublicFeedbackPageClientProps) {
  const { t } = useTranslation();

  if (!available || !businessId || !businessName) {
    // Neutral page for unknown/inactive businesses: identical response for
    // every invalid ID so the route does not reveal business existence.
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-10 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 text-center space-y-3">
            <h1 className="font-bold text-gray-900 text-lg">{t('feedback.publicPage.unavailableTitle')}</h1>
            <p className="text-xs text-gray-500">{t('feedback.publicPage.unavailableMessage')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
          <p className="text-sm text-gray-500">{t('publicPage.header')}</p>
        </div>

        <PublicFeedbackSubmitForm businessId={businessId} />

        <p className="text-center text-[11px] text-gray-400">{t('publicPage.footer')}</p>
      </div>
    </div>
  );
}
