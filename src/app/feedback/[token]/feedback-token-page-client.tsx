'use client';

import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { PublicFeedbackForm } from '@/components/feedback/public-feedback-form';

interface Verification {
  valid: boolean;
  reason?: string;
  message?: string | null;
  token?: string;
  business?: { name: string };
  customer?: { name: string } | null;
  sale?: { invoiceNumber: string } | null;
}

interface FeedbackTokenPageClientProps {
  verification: Verification;
}

export function FeedbackTokenPageClient({ verification }: FeedbackTokenPageClientProps) {
  const { t, tm } = useTranslation();

  if (!verification.valid) {
    const titleKey =
      verification.reason === 'ALREADY_USED'
        ? 'tokenPage.alreadyUsedTitle'
        : verification.reason === 'EXPIRED'
          ? 'tokenPage.expiredTitle'
          : 'tokenPage.invalidTitle';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 border border-gray-200 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            {verification.reason === 'ALREADY_USED' ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : verification.reason === 'EXPIRED' ? (
              <Clock className="w-7 h-7" />
            ) : (
              <AlertCircle className="w-7 h-7" />
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900">{t(titleKey)}</h2>

          <p className="text-xs text-gray-500 leading-relaxed">
            {tm(verification.message) || t('tokenPage.invalidMessageFallback')}
          </p>

          <p className="text-[11px] text-gray-400 pt-2">{t('tokenPage.assistance')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50/50 via-gray-50 to-white py-12 px-4 flex items-center justify-center">
      <PublicFeedbackForm
        token={verification.token!}
        businessName={verification.business!.name}
        customerName={verification.customer?.name}
        invoiceNumber={verification.sale?.invoiceNumber}
      />
    </div>
  );
}
