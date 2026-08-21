import { verifyFeedbackToken } from '@/services/feedback';
import { PublicFeedbackForm } from '@/components/feedback/public-feedback-form';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verification = await verifyFeedbackToken(token);

  if (!verification.valid) {
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

          <h2 className="text-xl font-bold text-gray-900">
            {verification.reason === 'ALREADY_USED'
              ? 'Feedback Already Received'
              : verification.reason === 'EXPIRED'
              ? 'Link Expired'
              : 'Invalid Feedback Link'}
          </h2>

          <p className="text-xs text-gray-500 leading-relaxed">
            {verification.message || 'This review link is not valid or has expired.'}
          </p>

          <p className="text-[11px] text-gray-400 pt-2">
            If you need assistance, please contact the store management directly.
          </p>
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
