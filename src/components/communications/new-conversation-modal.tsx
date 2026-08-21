'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, Search, Send, User, AlertCircle } from 'lucide-react';
import { listStoreMembersAction, startDirectConversationAction } from '@/app/actions/communication.actions';

export function NewConversationModal({
  businessId,
  isOpen,
  onClose,
  onConversationCreated,
}: {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}) {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      listStoreMembersAction(businessId).then((res) => {
        if (res.success && res.data) {
          setMembers(res.data as any[]);
        }
        setLoading(false);
      });
    }
  }, [isOpen, businessId]);

  if (!isOpen) return null;

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
    (m.position && m.position.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a colleague to message.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await startDirectConversationAction(businessId, {
      targetUserId: selectedUserId,
      initialMessage: initialMessage.trim() || undefined,
    });

    if (res.success && res.data) {
      onConversationCreated((res.data as any).id);
      onClose();
    } else {
      setError(res.message || 'Failed to start conversation.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">New Direct Message</h3>
            <p className="text-xs text-gray-500">Send an internal message to a team member</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Select Recipient</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="max-h-44 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
              {loading ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading members...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">No matching members found</div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    type="button"
                    key={m.userId}
                    onClick={() => setSelectedUserId(m.userId)}
                    className={`w-full p-2.5 text-left flex items-center justify-between text-xs transition-colors ${
                      selectedUserId === m.userId
                        ? 'bg-blue-50/80 font-bold text-blue-900'
                        : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div>
                      <span className="block font-semibold">{m.name}</span>
                      <span className="text-[11px] text-gray-400">
                        {m.position || m.role} {m.employeeCode ? `(${m.employeeCode})` : ''}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                      {m.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Initial Message (Optional)</label>
            <textarea
              rows={3}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="e.g. Please check the front counter inventory."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedUserId}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Starting...' : 'Start Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
