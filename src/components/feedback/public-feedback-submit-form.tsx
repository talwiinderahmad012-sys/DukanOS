'use client';

import { useState } from 'react';
import { Star, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { submitPublicFeedbackAction } from '@/app/actions/feedback-management.actions';
// Type-only import: erased at build time, never bundled into client JS.
import type { CustomerFeedbackType } from '@/generated/prisma/client';

// Enum values mirrored as string constants (Prisma client stays server-side).
const FEEDBACK_TYPES = ['FEEDBACK', 'COMPLAINT', 'REVIEW'] as const;

export function PublicFeedbackSubmitForm({
  businessId,
  products,
}: {
  businessId: string;
  products: { id: string; name: string }[];
}) {
  const { t, tm } = useTranslation();
  const [type, setType] = useState<CustomerFeedbackType>('FEEDBACK');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await submitPublicFeedbackAction({
      businessId,
      customerName: customerName || null,
      phone: phone || null,
      type,
      rating: rating > 0 ? rating : null,
      title,
      description,
      productId: productId || null,
    });
    setBusy(false);
    if (res.success) {
      setDone(true);
    } else {
      setError(res.message ? tm(res.message) : t('feedback.publicSubmit.submitFailed'));
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <h2 className="font-bold text-gray-900 text-lg">{t('feedback.publicSubmit.thankYouTitle')}</h2>
        <p className="text-xs text-gray-500">
          {phone ? t('feedback.publicSubmit.thankYouMessagePhone') : t('feedback.publicSubmit.thankYouMessage')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {FEEDBACK_TYPES.map((ty) => (
          <button
            key={ty}
            type="button"
            onClick={() => setType(ty as CustomerFeedbackType)}
            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
              type === ty
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {t(`feedback.enums.types.${ty}`, ty)}
          </button>
        ))}
      </div>

      {/* Star rating */}
      <div className="flex items-center justify-center gap-1 py-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
            aria-label={t('feedback.publicSubmit.starAria', { n })}
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                (hoverRating || rating) >= n
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('feedback.publicSubmit.titlePlaceholder')}
        maxLength={150}
        className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-primary"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder={
          type === 'COMPLAINT'
            ? t('feedback.publicSubmit.complaintPlaceholder')
            : t('feedback.publicSubmit.descriptionPlaceholder')
        }
        className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-primary"
      />

      {products.length > 0 && (
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5 bg-white"
        >
          <option value="">{t('feedback.publicSubmit.relatedProduct')}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={t('feedback.publicSubmit.namePlaceholder')}
          className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('feedback.publicSubmit.phonePlaceholder')}
          inputMode="tel"
          className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">{error}</div>
      )}

      <button
        onClick={submit}
        disabled={busy || !title.trim() || !description.trim()}
        className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary rounded-xl text-sm font-bold flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {t('common.submit')}
      </button>
    </div>
  );
}
