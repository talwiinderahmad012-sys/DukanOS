'use client';

import { useState } from 'react';
import { MessageSquare, Star, Bug, Lightbulb, Send, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { submitFeedbackAction } from '@/app/actions/feedback.actions';

type BugSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export function InAppFeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'FEEDBACK' | 'BUG' | 'REQUEST'>('FEEDBACK');
  const [satisfaction, setSatisfaction] = useState<'GREAT' | 'OKAY' | 'NEEDS_IMPROVEMENT'>('GREAT');
  const [severity, setSeverity] = useState<BugSeverity>('P2');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [module, setModule] = useState('Dashboard');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    const rating = satisfaction === 'GREAT' ? 5 : satisfaction === 'OKAY' ? 3 : 1;

    const res = await submitFeedbackAction({
      type,
      rating,
      title: title.trim() || undefined,
      severity: type === 'BUG' ? severity : undefined,
      message,
      module,
    });

    setLoading(false);
    if (res.success) {
      setStatusMessage({ success: true, text: res.message || 'Thank you! Your feedback has been received.' });
      setMessage('');
      setTitle('');
      setTimeout(() => {
        setIsOpen(false);
        setStatusMessage(null);
      }, 2000);
    } else {
      setStatusMessage({ success: false, text: res.message || 'Something went wrong.' });
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3.5 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-xs font-semibold"
        title="Share Feedback or Report Bug"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-base">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>DukaanOS Feedback & Bug Report</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusMessage ? (
              <div
                className={`p-4 rounded-xl text-center space-y-2 ${
                  statusMessage.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {statusMessage.success && <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />}
                <p className="text-sm font-medium">{statusMessage.text}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('FEEDBACK')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                      type === 'FEEDBACK'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" /> Satisfaction
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('BUG')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                      type === 'BUG'
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5" /> Report Bug
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('REQUEST')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                      type === 'REQUEST'
                        ? 'bg-amber-50 border-amber-500 text-amber-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" /> Idea / Request
                  </button>
                </div>

                {/* Satisfaction Mode */}
                {type === 'FEEDBACK' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">How is DukaanOS working for your shop?</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSatisfaction('GREAT')}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          satisfaction === 'GREAT'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        😊 Great
                      </button>
                      <button
                        type="button"
                        onClick={() => setSatisfaction('OKAY')}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          satisfaction === 'OKAY'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        😐 Okay
                      </button>
                      <button
                        type="button"
                        onClick={() => setSatisfaction('NEEDS_IMPROVEMENT')}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          satisfaction === 'NEEDS_IMPROVEMENT'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        😞 Needs Work
                      </button>
                    </div>
                  </div>
                )}

                {/* Bug Mode Severity */}
                {type === 'BUG' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                      <span>Bug Severity</span>
                      <span className="text-[10px] text-gray-400">P0=Critical, P3=Cosmetic</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                      {(['P0', 'P1', 'P2', 'P3'] as BugSeverity[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSeverity(s)}
                          className={`py-1.5 rounded-lg border transition-all ${
                            severity === s
                              ? s === 'P0'
                                ? 'bg-red-600 text-white border-red-700'
                                : s === 'P1'
                                ? 'bg-orange-500 text-white border-orange-600'
                                : 'bg-blue-600 text-white border-blue-700'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Module selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Feature Area</label>
                  <select
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Dashboard">Dashboard</option>
                    <option value="POS">Point of Sale (POS)</option>
                    <option value="Products">Products & Inventory</option>
                    <option value="Purchases">Purchases & Suppliers</option>
                    <option value="Customers">Customers & Udhaar</option>
                    <option value="Reports">Financial Reports</option>
                    <option value="Employees">Staff & Attendance</option>
                    <option value="OfflineSync">Offline Mode / Sync</option>
                    <option value="Cameras">Remote Cameras</option>
                    <option value="Communications">Communications</option>
                  </select>
                </div>

                {/* Title for Bug or Request */}
                {(type === 'BUG' || type === 'REQUEST') && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={type === 'BUG' ? 'Short summary of the bug...' : 'Feature title...'}
                      className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Message */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    {type === 'BUG' ? 'Steps to Reproduce & Expected Behavior' : 'Details / Notes'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      type === 'BUG'
                        ? 'Describe what happened and how to trigger it...'
                        : type === 'REQUEST'
                        ? 'Explain why this feature would help your business...'
                        : 'Tell us what you like or what could be improved...'
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {loading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
