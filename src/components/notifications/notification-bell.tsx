'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  ExternalLink, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Sparkles,
  Layers
} from 'lucide-react';
import { 
  listNotificationsAction, 
  getUnreadNotificationsCountAction, 
  markNotificationReadAction,
  markAllNotificationsReadAction
} from '@/app/actions/notification.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function NotificationBell({ businessId }: { businessId: string }) {
  const { t, language } = useTranslation();
  const langLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    const res = await getUnreadNotificationsCountAction(businessId);
    if (res.success && res.data) {
      setUnreadCount((res.data as any).count);
    }
  };

  const loadDropdownNotifications = async () => {
    setLoading(true);
    const res = await listNotificationsAction(businessId, { limit: 6 });
    if (res.success && res.data) {
      setNotifications((res.data as any).notifications);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUnreadCount();

    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [businessId]);

  const handleToggle = () => {
    if (!isOpen) {
      loadDropdownNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationReadAction(businessId, id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction(businessId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };


  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title={t('common.notifications')}
        aria-label={unreadCount > 0 ? t('notifications.bellAriaUnread', { count: unreadCount }) : t('notifications.bellAria')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-0.5 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95" role="dialog" aria-label={t('notifications.panelAria')}>
          {/* Top Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('common.notifications')}</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-gray-950 dark:bg-primary-soft0/20 dark:text-blue-400">
                  {t('notifications.newCount', { count: unreadCount })}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-gray-900 hover:text-gray-900 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('notifications.markAllRead')}</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500">{t('notifications.loadingAlerts')}</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('notifications.noNotifications')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{t('notifications.allSystemsNormal')}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors flex items-start justify-between gap-3 ${
                    !n.isRead ? 'bg-primary-soft/30 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          n.severity === 'CRITICAL' || n.severity === 'ALERT'
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                            : n.severity === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            : 'bg-primary-soft text-gray-950 border-blue-200 dark:bg-primary-soft0/10 dark:text-blue-400 dark:border-blue-500/20'
                        }`}
                      >
                        {t(`notifications.severities.${n.severity}`, n.severity)}
                      </span>
                      <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{n.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-mono">
                      {new Date(n.createdAt).toLocaleTimeString(langLocale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        onClick={() => setIsOpen(false)}
                        className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-blue-400 rounded-md"
                        title={t('common.viewDetails')}
                      >
                        <ExternalLink className="w-3.5 h-3.5 rtl-flip" />
                      </Link>
                    )}

                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-md"
                        title={t('notifications.markAsRead')}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-gray-900 hover:text-gray-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {t('notifications.viewAllNotifications')} <span className="inline-block rtl-flip" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
