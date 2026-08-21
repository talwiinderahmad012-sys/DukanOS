'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  AlertTriangle, 
  Minus, 
  CheckCircle2, 
  Filter, 
  Search, 
  Edit3, 
  User, 
  FileText,
  Copy,
  ExternalLink,
  Plus
} from 'lucide-react';
import { ResolveFeedbackModal } from './resolve-feedback-modal';
import { generateFeedbackInviteAction } from '@/app/actions/feedback.actions';

export function FeedbackDashboardView({
  businessId,
  stats,
  feedbacksData,
  searchParams,
}: {
  businessId: string;
  stats: any;
  feedbacksData: any;
  searchParams: any;
}) {
  const { feedbacks, pagination } = feedbacksData;
  const [activeModalFeedback, setActiveModalFeedback] = useState<any | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const handleGenerateLink = async () => {
    setCreatingLink(true);
    const res = await generateFeedbackInviteAction(businessId, {});
    if (res.success && res.data) {
      const invite = res.data as { token: string };
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setGeneratedLink(`${origin}/feedback/${invite.token}`);
    }
    setCreatingLink(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Feedback & Reviews</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monitor customer satisfaction, 1–5 star ratings, and address service feedback.
          </p>
        </div>

        <button
          onClick={handleGenerateLink}
          disabled={creatingLink}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> {creatingLink ? 'Generating...' : 'Create Feedback Invite Link'}
        </button>
      </div>

      {/* Generated Link Popup Card */}
      {generatedLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-0.5 max-w-xl">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" /> New Secure Feedback Link Generated:
            </span>
            <p className="text-xs text-blue-800 font-mono truncate">{generatedLink}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => copyToClipboard(generatedLink)}
              className="px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={generatedLink}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Average Rating</span>
          <div className="flex items-center gap-2 mt-1">
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.averageRating ? `${stats.averageRating}` : '—'}
            </h3>
            {stats.averageRating && <Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
          </div>
          <span className="text-[11px] text-gray-400">{stats.totalReviews} total reviews</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-green-700 uppercase">Positive (4-5★)</span>
          <h3 className="text-2xl font-bold text-green-700 mt-1">{stats.positiveCount}</h3>
          <span className="text-[11px] text-green-600">Satisfied customers</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase">Neutral (3★)</span>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{stats.neutralCount}</h3>
          <span className="text-[11px] text-amber-600">Average experience</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-red-700 uppercase">Negative (1-2★)</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">{stats.negativeCount}</h3>
          <span className="text-[11px] text-red-500">Needs attention</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase">New Feedback</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">{stats.newCount}</h3>
          <span className="text-[11px] text-blue-500">Awaiting review</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <form method="GET" className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={searchParams.search || ''}
              placeholder="Search comments or customer name..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              name="rating"
              defaultValue={searchParams.rating || ''}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Stars</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            <select
              name="status"
              defaultValue={searchParams.status || 'ALL'}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="REVIEWING">Under Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Feedbacks List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {feedbacks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No customer feedback yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Generate and share feedback invite links with your customers or include feedback links on receipts.
            </p>
            <button
              onClick={handleGenerateLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Feedback Link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {feedbacks.map((f: any) => (
              <div key={f.id} className="p-5 hover:bg-gray-50/50 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-amber-900">{f.rating}.0</span>
                    </div>

                    <div>
                      <span className="font-bold text-gray-900 text-xs">
                        {f.isAnonymous ? 'Anonymous Customer' : (f.customer?.name || 'Verified Customer')}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">({f.category})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        f.status === 'RESOLVED'
                          ? 'bg-green-100 text-green-800'
                          : f.status === 'REVIEWING'
                          ? 'bg-amber-100 text-amber-800'
                          : f.status === 'NEW'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {f.status}
                    </span>

                    <button
                      onClick={() => setActiveModalFeedback(f)}
                      className="px-2.5 py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Action
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed pl-1">
                  "{f.message}"
                </p>

                {/* Resolution Note If Exists */}
                {f.resolutionNote && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
                    <span className="font-bold block flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Manager Resolution Note:
                    </span>
                    <p className="text-emerald-900 text-[11px]">{f.resolutionNote}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                  <span>Submitted on {new Date(f.createdAt).toLocaleDateString()}</span>
                  {f.sale && (
                    <Link
                      href={`/dashboard/sales/${f.sale.id}`}
                      className="text-blue-600 hover:underline flex items-center gap-1 font-mono"
                    >
                      <FileText className="w-3 h-3" /> Invoice #{f.sale.invoiceNumber}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total reviews)
            </span>
            <div className="flex gap-1">
              {pagination.page > 1 && (
                <Link
                  href={`/dashboard/feedback?page=${pagination.page - 1}`}
                  className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium"
                >
                  Previous
                </Link>
              )}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={`/dashboard/feedback?page=${pagination.page + 1}`}
                  className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {activeModalFeedback && (
        <ResolveFeedbackModal
          businessId={businessId}
          feedbackId={activeModalFeedback.id}
          customerName={activeModalFeedback.isAnonymous ? 'Anonymous' : activeModalFeedback.customer?.name}
          rating={activeModalFeedback.rating}
          message={activeModalFeedback.message}
          currentStatus={activeModalFeedback.status}
          currentResolution={activeModalFeedback.resolutionNote}
          isOpen={!!activeModalFeedback}
          onClose={() => setActiveModalFeedback(null)}
        />
      )}
    </div>
  );
}
