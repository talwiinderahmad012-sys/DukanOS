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

export function NotificationBell({ businessId }: { businessId: string }) {
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'ALERT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 relative transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Top Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <p className="text-xs font-bold text-gray-700">No notifications</p>
                <p className="text-[11px] text-gray-400">All business operations running normally.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 hover:bg-gray-50/70 transition-colors flex items-start justify-between gap-3 ${
                    !n.isRead ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getSeverityStyle(
                          n.severity
                        )}`}
                      >
                        {n.severity}
                      </span>
                      <h4 className="font-bold text-xs text-gray-900 truncate">{n.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-gray-400 block font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], {
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
                        className="p-1 text-gray-400 hover:text-blue-600 rounded-md"
                        title="View details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded-md"
                        title="Mark as read"
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
          <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              View All Notifications &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
