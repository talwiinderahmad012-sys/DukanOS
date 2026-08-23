'use client';

import { useState } from 'react';
import { Star, Send, Loader2, CheckCircle2 } from 'lucide-react';
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
      setError(res.message || 'Failed to submit. Please try again.');
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <h2 className="font-bold text-gray-900 text-lg">Thank you!</h2>
        <p className="text-xs text-gray-500">
          Your submission has been received{phone ? ' — we may contact you on the number provided' : ''}.
          The business owner has been notified.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {FEEDBACK_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t as CustomerFeedbackType)}
            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
              type === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
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
            aria-label={`${n} star`}
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
        placeholder="Short title (e.g. 'Late delivery on Tuesday')"
        maxLength={150}
        className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder={
          type === 'COMPLAINT'
            ? 'Please describe what went wrong so we can fix it...'
            : 'Tell us more about your experience...'
        }
        className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
      />

      {products.length > 0 && (
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5 bg-white"
        >
          <option value="">Related product (optional)</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone for follow-up (optional)"
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
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Submit
      </button>
    </div>
  );
}