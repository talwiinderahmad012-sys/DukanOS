'use client';

import { useState } from 'react';
import { Star, CheckCircle2, AlertCircle, Heart, Store, Send, UserX } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { submitFeedbackAction } from '@/app/actions/feedback.actions';

type CategoryOption = 'SERVICE' | 'PRODUCT' | 'PRICE' | 'STAFF' | 'CLEANLINESS' | 'DELIVERY' | 'OTHER';

const categories: CategoryOption[] = ['SERVICE', 'PRODUCT', 'PRICE', 'STAFF', 'CLEANLINESS', 'DELIVERY', 'OTHER'];

export function PublicFeedbackForm({
  token,
  businessName,
  customerName,
  invoiceNumber,
}: {
  token: string;
  businessName: string;
  customerName?: string | null;
  invoiceNumber?: string | null;
}) {
  const { t, tm, language, toggleLanguage } = useTranslation();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<CategoryOption>('SERVICE');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await submitFeedbackAction({
      token,
      rating,
      category,
      message,
      isAnonymous,
    });

    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.message ? tm(res.message) : t('feedback.publicForm.submitFailed'));
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xl text-center space-y-6 max-w-md mx-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Heart className="w-8 h-8 fill-current text-red-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900">{t('feedback.publicForm.thankYouTitle')}</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            {t('feedback.publicForm.thankYouDesc').split('{business}')[0]}
            <span className="font-bold text-gray-900">{businessName}</span>
            {t('feedback.publicForm.thankYouDesc').split('{business}')[1]}
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center gap-1.5 text-amber-500">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= rating ? 'fill-current text-amber-400' : 'text-gray-200'
              }`}
            />
          ))}
          <span className="text-xs font-bold text-gray-700 ms-2">
            {t('feedback.publicForm.yourRating', { rating })}
          </span>
        </div>

        <p className="text-xs text-gray-400">
          {t('feedback.publicForm.thankYouFooter')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden max-w-lg mx-auto">
      {/* Top Banner */}
      <div className="relative bg-linear-to-r from-blue-600 to-indigo-600 p-6 sm:p-8 text-white space-y-2 text-center">
        <button
          type="button"
          onClick={toggleLanguage}
          className="absolute top-3 end-3 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-semibold backdrop-blur-xs transition-colors"
        >
          {language === 'EN' ? <span className="urdu-font">اردو</span> : 'English'}
        </button>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs">
          <Store className="w-3.5 h-3.5" /> {businessName}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t('feedback.publicForm.heading')}</h1>
        <p className="text-blue-100 text-xs max-w-sm mx-auto">
          {customerName ? t('feedback.publicForm.introNamed', { name: customerName }) : t('feedback.publicForm.introAnonymous')}
          {invoiceNumber && <span className="block font-mono text-[11px] mt-1 text-white/80">{t('feedback.publicForm.invoice', { number: invoiceNumber })}</span>}
        </p>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Interactive Star Rating */}
        <div className="space-y-2 text-center">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
            {t('feedback.publicForm.overallRating')}
          </label>
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform active:scale-90 focus:outline-none"
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      active
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-gray-300 hover:text-amber-200'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <span className="text-xs font-bold text-gray-700 block">
            {rating === 5 && t('feedback.publicForm.rating5')}
            {rating === 4 && t('feedback.publicForm.rating4')}
            {rating === 3 && t('feedback.publicForm.rating3')}
            {rating === 2 && t('feedback.publicForm.rating2')}
            {rating === 1 && t('feedback.publicForm.rating1')}
          </span>
        </div>

        {/* 2. Feedback Category */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 block">
            {t('feedback.publicForm.categoryQuestion')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((id) => (
              <button
                type="button"
                key={id}
                onClick={() => setCategory(id)}
                className={`p-3 rounded-2xl border text-start transition-all ${
                  category === id
                    ? 'border-primary bg-primary-soft/60 ring-2 ring-primary'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className={`text-xs font-bold block ${category === id ? 'text-blue-900' : 'text-gray-800'}`}>
                  {t(`feedback.enums.categories.${id}.label`)}
                </span>
                <span className="text-[11px] text-gray-400 block truncate">{t(`feedback.enums.categories.${id}.desc`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Detailed Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">
            {t('feedback.publicForm.commentsLabel')}
          </label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedback.publicForm.commentsPlaceholder')}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* 4. Anonymous Toggle */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer" onClick={() => setIsAnonymous(!isAnonymous)}>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded text-gray-900 focus:ring-primary h-4 w-4"
          />
          <div className="text-xs text-gray-700 select-none">
            <span className="font-semibold block">{t('feedback.publicForm.anonymousTitle')}</span>
            <span className="text-[11px] text-gray-400">{t('feedback.publicForm.anonymousDesc')}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary hover:bg-primary-hover text-on-primary font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {loading ? t('common.submitting') : t('feedback.publicForm.submitReview')}
        </button>
      </form>
    </div>
  );
}
