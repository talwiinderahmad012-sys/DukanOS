'use client';

import { useState } from 'react';
import { Star, Copy, CheckCircle2, Share2, ExternalLink } from 'lucide-react';
import { generateFeedbackInviteAction } from '@/app/actions/feedback.actions';

export function InvoiceFeedbackButton({
  businessId,
  saleId,
  customerId,
}: {
  businessId: string;
  saleId: string;
  customerId?: string | null;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateFeedbackInviteAction(businessId, {
      saleId,
      customerId: customerId || undefined,
    });

    if (res.success && res.data) {
      const invite = res.data as { token: string };
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setLink(`${origin}/feedback/${invite.token}`);
    }
    setLoading(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="print:hidden">
      {!link ? (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          {loading ? 'Generating...' : 'Get Feedback Link'}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(link)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-600" /> Copy Feedback Link
              </>
            )}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1.5 text-gray-500 hover:text-gray-900 text-xs flex items-center"
            title="Open link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
