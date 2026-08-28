'use client';

import { PublicFeedbackSubmitForm } from '@/components/feedback/public-feedback-submit-form';
import { useTranslation } from '@/lib/i18n/language-context';

interface PublicFeedbackPageClientProps {
  businessId: string;
  businessName: string;
  products: { id: string; name: string }[];
}

export function PublicFeedbackPageClient({ businessId, businessName, products }: PublicFeedbackPageClientProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
          <p className="text-sm text-gray-500">{t('publicPage.header')}</p>
        </div>

        <PublicFeedbackSubmitForm
          businessId={businessId}
          products={products}
        />

        <p className="text-center text-[11px] text-gray-400">{t('publicPage.footer')}</p>
      </div>
    </div>
  );
}
