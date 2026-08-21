'use client';

import { useState } from 'react';
import { Star, CheckCircle2, AlertCircle, Heart, Store, Send, UserX } from 'lucide-react';
import { submitFeedbackAction } from '@/app/actions/feedback.actions';

type CategoryOption = 'SERVICE' | 'PRODUCT' | 'PRICE' | 'STAFF' | 'CLEANLINESS' | 'DELIVERY' | 'OTHER';

const categories: { id: CategoryOption; label: string; desc: string }[] = [
  { id: 'SERVICE', label: 'Store Service', desc: 'Overall shopping experience' },
  { id: 'PRODUCT', label: 'Product Quality', desc: 'Item freshness & quality' },
  { id: 'PRICE', label: 'Pricing & Value', desc: 'Fairness of product prices' },
  { id: 'STAFF', label: 'Staff Behavior', desc: 'Courtesy and helpfulness' },
  { id: 'CLEANLINESS', label: 'Store Cleanliness', desc: 'Store environment' },
  { id: 'DELIVERY', label: 'Order & Packaging', desc: 'Packing & handling' },
  { id: 'OTHER', label: 'Other Feedback', desc: 'General comments' },
];

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
      setError(res.message || 'Failed to submit your feedback. Please try again.');
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
          <h2 className="text-2xl font-black text-gray-900">Thank you! ❤️</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Your feedback helps <span className="font-bold text-gray-900">{businessName}</span> continually improve our products and service.
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
          <span className="text-xs font-bold text-gray-700 ml-2">
            ({rating} / 5 Stars)
          </span>
        </div>

        <p className="text-xs text-gray-400">
          We appreciate your patronage and look forward to serving you again!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden max-w-lg mx-auto">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6 sm:p-8 text-white space-y-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs">
          <Store className="w-3.5 h-3.5" /> {businessName}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">How was your experience?</h1>
        <p className="text-blue-100 text-xs max-w-sm mx-auto">
          {customerName ? `Hi ${customerName}, please` : 'Please'} take 30 seconds to share your honest rating.
          {invoiceNumber && <span className="block font-mono text-[11px] mt-1 text-white/80">Invoice #{invoiceNumber}</span>}
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
            Overall Rating
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
            {rating === 5 && '⭐️ Excellent! Loved everything.'}
            {rating === 4 && '👍 Good experience, mostly satisfied.'}
            {rating === 3 && '👌 Average, room for improvement.'}
            {rating === 2 && '👎 Dissatisfied, had issues.'}
            {rating === 1 && '⚠️ Very poor, need resolution.'}
          </span>
        </div>

        {/* 2. Feedback Category */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 block">
            What is this feedback primarily about?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  category === cat.id
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className={`text-xs font-bold block ${category === cat.id ? 'text-blue-900' : 'text-gray-800'}`}>
                  {cat.label}
                </span>
                <span className="text-[11px] text-gray-400 block truncate">{cat.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Detailed Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">
            Your Comments & Suggestions
          </label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you liked or what we can do better..."
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* 4. Anonymous Toggle */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer" onClick={() => setIsAnonymous(!isAnonymous)}>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
          />
          <div className="text-xs text-gray-700 select-none">
            <span className="font-semibold block">Submit as Anonymous</span>
            <span className="text-[11px] text-gray-400">Do not attach my name or customer identity to this review</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}
