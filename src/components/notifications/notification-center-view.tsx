'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  ExternalLink, 
  Settings, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Sparkles,
  Filter,
  Trash2
} from 'lucide-react';
import { 
  markNotificationReadAction, 
  markAllNotificationsReadAction 
} from '@/app/actions/notification.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function NotificationCenterView({
  businessId,
  initialNotifications,
  initialTotal,
}: {
  businessId: string;
  initialNotifications: any[];
  initialTotal: number;
}) {
  const { t, language } = useTranslation();
  const langLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'CRITICAL' | 'DIGEST'>('ALL');

  const handleMarkAsRead = async (id: string) => {
    await markNotificationReadAction(businessId, id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction(businessId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === 'UNREAD') return !n.isRead;
    if (filterTab === 'CRITICAL') return n.severity === 'CRITICAL' || n.severity === 'WARNING';
    if (filterTab === 'DIGEST') return n.type === 'DAILY_DIGEST';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'ALERT':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: ShieldAlert };
      case 'WARNING':
        return { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle };
      case 'SUCCESS':
        return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCheck };
      default:
        return { color: 'bg-primary-soft text-gray-900 border-blue-200', icon: Info };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notifications.centerTitle')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('notifications.centerSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{t('notifications.markAllAsRead')}</span>
            </button>
          )}

          <Link
            href="/dashboard/settings/notifications"
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t('notifications.alertPreferences')}</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilterTab('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterTab === 'ALL'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t('notifications.allAlerts', { count: notifications.length })}
        </button>

        <button
          onClick={() => setFilterTab('UNREAD')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            filterTab === 'UNREAD'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span>{t('notifications.unread')}</span>
          {unreadCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-primary"></span>
          )}
        </button>

        <button
          onClick={() => setFilterTab('CRITICAL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterTab === 'CRITICAL'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t('notifications.criticalAndWarnings')}
        </button>

        <button
          onClick={() => setFilterTab('DIGEST')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterTab === 'DIGEST'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t('notifications.dailyDigests')}
        </button>
      </div>

      {/* Notifications Feed */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">{t('notifications.noNotificationsFound')}</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {t('notifications.noNotificationsFoundDesc')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((n) => {
              const { color, icon: Icon } = getSeverityBadge(n.severity);

              return (
                <div
                  key={n.id}
                  className={`p-5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    !n.isRead ? 'bg-primary-soft/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`p-2.5 rounded-2xl border ${color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${color}`}>
                          {t(`notifications.severities.${n.severity}`, n.severity)}
                        </span>
                        <h3 className="font-bold text-xs text-gray-900">{n.title}</h3>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                        )}
                      </div>

                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {n.message}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-0.5 font-mono">
                        <span>{new Date(n.createdAt).toLocaleString(langLocale)}</span>
                        {n.type && <span>• {t('common.type')}: {t(`notifications.types.${n.type}`, n.type)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>{t('common.view')}</span>
                        <ExternalLink className="w-3.5 h-3.5 rtl-flip" />
                      </Link>
                    )}

                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="px-3 py-1.5 bg-primary-soft hover:bg-blue-100 text-gray-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                        title={t('notifications.markAsRead')}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('notifications.acknowledge')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
