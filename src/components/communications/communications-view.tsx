'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Megaphone, 
  Plus, 
  Send, 
  Check, 
  CheckCheck, 
  Clock, 
  Search, 
  ArrowLeft, 
  User, 
  ShieldAlert, 
  AlertTriangle, 
  Info,
  Archive,
  RefreshCw
} from 'lucide-react';
import { 
  sendMessageAction, 
  getConversationMessagesAction, 
  markConversationReadAction,
  markAnnouncementReadAction,
  archiveAnnouncementAction
} from '@/app/actions/communication.actions';
import { NewConversationModal } from './new-conversation-modal';
import { NewAnnouncementModal } from './new-announcement-modal';
import { useTranslation } from '@/lib/i18n/language-context';

export type ConversationData = {
  id: string;
  type: string;
  title: string | null;
  updatedAt: string | Date;
  otherUser: {
    id: string;
    name: string;
    email: string | null;
    position: string | null;
    employeeCode: string | null;
  } | null;
  lastMessage: {
    content: string;
    createdAt: string | Date;
    senderId: string;
  } | null;
  unreadCount: number;
};

export type AnnouncementData = {
  id: string;
  title: string;
  message: string;
  priority: string;
  targetRole: string;
  expiresAt: string | null;
  isArchived: boolean;
  createdAt: string | Date;
  authorName: string;
  branchName: string | null;
  isRead: boolean;
  readAt: string | null;
};

const PRIORITY_LABEL_KEYS: Record<string, string> = {
  NORMAL: 'communications.priorities.NORMAL',
  IMPORTANT: 'communications.priorities.IMPORTANT',
  URGENT: 'communications.priorities.URGENT',
};

const ROLE_LABEL_KEYS: Record<string, string> = {
  ALL: 'communications.roles.ALL',
  OWNER: 'communications.roles.OWNER',
  MANAGER: 'communications.roles.MANAGER',
  CASHIER: 'communications.roles.CASHIER',
  EMPLOYEE: 'communications.roles.EMPLOYEE',
};

export function CommunicationsView({
  businessId,
  currentUserId,
  userRole,
  initialConversations,
  initialAnnouncements,
}: {
  businessId: string;
  currentUserId: string;
  userRole: string;
  initialConversations: ConversationData[];
  initialAnnouncements: AnnouncementData[];
}) {
  const { t, language } = useTranslation();
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const [activeTab, setActiveTab] = useState<'messages' | 'announcements'>('messages');
  const [conversations, setConversations] = useState<ConversationData[]>(initialConversations);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>(initialAnnouncements);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversations[0]?.id || null
  );
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOwnerOrManager = userRole === 'OWNER' || userRole === 'MANAGER';

  const priorityLabel = (priority: string) =>
    t(PRIORITY_LABEL_KEYS[priority] ?? 'common.info');
  const roleLabel = (role: string) => t(ROLE_LABEL_KEYS[role] ?? 'common.other');

  // Load messages when activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) return;

    setLoadingMessages(true);
    getConversationMessagesAction(businessId, activeConversationId).then((res) => {
      if (res.success && res.data) {
        const data = res.data as any;
        setActiveConversation(data.conversation);
        setMessages(data.messages);
        // Mark read
        markConversationReadAction(businessId, activeConversationId);
        // Clear local unread count
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c))
        );
      }
      setLoadingMessages(false);
    });
  }, [businessId, activeConversationId]);

  // Scroll to bottom of message thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !messageInput.trim() || sending) return;

    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    // Optimistic message append
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      senderId: currentUserId,
      senderName: t('communications.you'),
      content,
      createdAt: new Date().toISOString(),
      isMe: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendMessageAction(businessId, {
      conversationId: activeConversationId,
      content,
    });

    if (res.success) {
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                lastMessage: {
                  content,
                  createdAt: new Date(),
                  senderId: currentUserId,
                },
                updatedAt: new Date(),
              }
            : c
        )
      );
    }
    setSending(false);
  };

  const handleAcknowledgeAnnouncement = async (announcementId: string) => {
    await markAnnouncementReadAction(businessId, announcementId);
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, isRead: true } : a))
    );
  };

  const handleArchiveAnnouncement = async (announcementId: string) => {
    await archiveAnnouncementAction(businessId, announcementId);
    setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
  };

  const filteredConversations = conversations.filter((c) =>
    c.otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('communications.pageTitle')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('communications.pageSubtitle')}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
              activeTab === 'messages'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t('communications.tabMessages')}</span>
            {conversations.some((c) => c.unreadCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-primary"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
              activeTab === 'announcements'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>{t('communications.tabAnnouncements', { count: announcements.length })}</span>
            {announcements.some((a) => !a.isRead) && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
        </div>
      </div>

      {/* 1. Direct Messages Tab */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px] max-h-[700px]">
          {/* Left: Conversations Sidebar */}
          <div className={`md:col-span-4 border-e border-gray-200 flex flex-col h-full ${activeConversationId && 'hidden md:flex'}`}>
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-xs uppercase tracking-wider">{t('communications.chats')}</span>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> {t('communications.new')}
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t('communications.searchChats')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-8 pe-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  {t('communications.noConversations')}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConversationId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={`w-full p-4 text-start flex items-start justify-between transition-colors ${
                        isSelected ? 'bg-primary-soft/70 border-s-4 border-primary' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-gray-950 font-bold text-xs flex items-center justify-center shrink-0">
                          {conv.otherUser?.name.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {conv.otherUser?.name || t('communications.storeColleague')}
                            </span>
                            {conv.otherUser?.position && (
                              <span className="text-[10px] text-gray-400 truncate">
                                • {conv.otherUser.position}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate max-w-[180px]">
                            {conv.lastMessage ? conv.lastMessage.content : t('communications.noMessagesYet')}
                          </p>
                        </div>
                      </div>

                      <div className="text-end shrink-0 space-y-1">
                        {conv.lastMessage && (
                          <span className="text-[10px] text-gray-400 block font-mono">
                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-primary text-on-primary rounded-full text-[10px] font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Message Stream & Composer */}
          <div className={`md:col-span-8 flex flex-col h-full bg-gray-50/30 ${!activeConversationId && 'hidden md:flex'}`}>
            {activeConversation ? (
              <>
                {/* Chat Top Bar */}
                <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveConversationId(null)}
                      className="md:hidden p-1 text-gray-500 hover:text-gray-900"
                    >
                      <ArrowLeft className="w-5 h-5 rtl-flip" />
                    </button>

                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-gray-950 font-bold text-xs flex items-center justify-center">
                      {activeConversation.otherUser?.name.slice(0, 2).toUpperCase() || 'U'}
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 text-xs">
                        {activeConversation.otherUser?.name || t('communications.storeColleague')}
                      </h3>
                      <span className="text-[11px] text-gray-400">
                        {activeConversation.otherUser?.position || t('communications.internalMember')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Thread */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      {t('communications.loadingConversation')}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      {t('communications.threadEmpty')}
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-sm sm:max-w-md p-3 rounded-2xl text-xs space-y-1 leading-relaxed ${
                            m.isMe
                              ? 'bg-primary text-on-primary rounded-ee-none shadow-xs'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-es-none shadow-xs'
                          }`}
                        >
                          {!m.isMe && (
                            <span className="block font-bold text-[10px] text-gray-900 mb-0.5">
                              {m.senderName}
                            </span>
                          )}
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <span
                            className={`block text-[9px] text-end font-mono ${
                              m.isMe ? 'text-blue-200' : 'text-gray-400'
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    required
                    placeholder={t('communications.composerPlaceholder')}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageInput.trim()}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('common.send')}</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center text-xs text-gray-400">
                {t('communications.selectConversation')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">{t('communications.storeBroadcasts')}</span>
            {isOwnerOrManager && (
              <button
                onClick={() => setShowNewAnnouncementModal(true)}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> {t('communications.publishAnnouncement')}
              </button>
            )}
          </div>

          {announcements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{t('communications.noAnnouncementsTitle')}</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {t('communications.noAnnouncementsDescription')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map((a) => {
                const isUrgent = a.priority === 'URGENT';
                const isImportant = a.priority === 'IMPORTANT';

                return (
                  <div
                    key={a.id}
                    className={`bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between space-y-4 ${
                      isUrgent
                        ? 'border-red-200 ring-2 ring-red-500/20'
                        : isImportant
                        ? 'border-amber-200 ring-2 ring-amber-500/20'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                            isUrgent
                              ? 'bg-red-100 text-red-800'
                              : isImportant
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-primary-soft text-gray-900'
                          }`}
                        >
                          {priorityLabel(a.priority)}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400">
                            {t('communications.audienceLabel')}{' '}
                            <strong className="text-gray-700">{roleLabel(a.targetRole)}</strong>
                          </span>
                          {isOwnerOrManager && (
                            <button
                              onClick={() => handleArchiveAnnouncement(a.id)}
                              className="text-gray-400 hover:text-red-600 p-1"
                              title={t('communications.archiveAnnouncement')}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base">{a.title}</h3>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {a.message}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-gray-400">
                        <span>
                          {t('communications.byAuthor', { name: a.authorName })} •{' '}
                          {new Date(a.createdAt).toLocaleDateString(locale)}
                        </span>
                      </div>

                      {a.isRead ? (
                        <span className="text-green-600 flex items-center gap-1 font-semibold text-[11px]">
                          <CheckCheck className="w-3.5 h-3.5" /> {t('communications.acknowledged')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledgeAnnouncement(a.id)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-[11px] transition-colors"
                        >
                          {t('communications.markAsRead')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <NewConversationModal
        businessId={businessId}
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onConversationCreated={(convId) => {
          setActiveConversationId(convId);
        }}
      />

      <NewAnnouncementModal
        businessId={businessId}
        isOpen={showNewAnnouncementModal}
        onClose={() => setShowNewAnnouncementModal(false)}
      />
    </div>
  );
}
