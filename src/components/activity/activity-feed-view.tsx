'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  ShoppingCart, 
  Package, 
  UserCheck, 
  Users, 
  ShieldCheck, 
  Filter, 
  ExternalLink,
  Clock
} from 'lucide-react';
// Type-only import: the source module is server-only; this client component
// must never pull its runtime (Prisma) into the browser bundle.
import type { ActivityCategory, ActivityEvent } from '@/services/activity';
import { useTranslation } from '@/lib/i18n/language-context';

const categories: { id: ActivityCategory | 'ALL'; icon: any }[] = [
  { id: 'ALL', icon: Activity },
  { id: 'SALES', icon: ShoppingCart },
  { id: 'INVENTORY', icon: Package },
  { id: 'STAFF', icon: UserCheck },
  { id: 'CUSTOMER', icon: Users },
  { id: 'ADMIN', icon: ShieldCheck },
];

export function ActivityFeedView({
  initialEvents,
}: {
  initialEvents: ActivityEvent[];
}) {
  const { t, language } = useTranslation();
  const langLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'ALL'>('ALL');

  const filteredEvents = initialEvents.filter((e) =>
    selectedCategory === 'ALL' ? true : e.category === selectedCategory
  );

  const getCategoryBadge = (category: ActivityCategory) => {
    switch (category) {
      case 'SALES':
        return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShoppingCart };
      case 'INVENTORY':
        return { color: 'bg-primary-soft text-gray-950 border-blue-200', icon: Package };
      case 'STAFF':
        return { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: UserCheck };
      case 'CUSTOMER':
        return { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Users };
      case 'ADMIN':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: ShieldCheck };
    }
  };

  const getEventTitle = (evt: ActivityEvent): string => {
    switch (evt.type) {
      case 'SALE_CANCELLED':
        return t('activity.events.saleCancelled');
      case 'PURCHASE_CANCELLED':
        return t('activity.events.purchaseCancelled');
      case 'STOCK_ADJUSTED':
        return t('activity.events.stockAdjusted');
      case 'CUSTOMER_PAYMENT':
        return t('activity.events.customerPayment');
      case 'CUSTOMER_CREATED':
        return t('activity.events.customerCreated');
      case 'LEAVE_REQUESTED':
        return t('activity.events.leaveRequested');
      case 'LEAVE_CANCELLED':
        return t('activity.events.leaveCancelled');
      case 'SALARY_PAID':
        return t('activity.events.salaryPaid');
      case 'ANNOUNCEMENT_ARCHIVED':
        return t('activity.events.announcementArchived');
    }
    if (evt.type.startsWith('SALE_')) return t('activity.events.saleCheckout');
    if (evt.type.startsWith('PURCHASE_')) return t('activity.events.purchaseRecorded');
    if (evt.type.startsWith('SALARY_')) return t('activity.events.salaryRecordCreated');
    if (evt.type.startsWith('ANNOUNCEMENT_')) return t('activity.events.announcementPublished');
    if (evt.type.startsWith('LEAVE_')) {
      const status = evt.title.replace(/^Employee Leave\s*/, '').trim();
      return status
        ? t('activity.events.employeeLeave', { status: t(`activity.statuses.${status.toUpperCase()}`, status) })
        : t('activity.events.employeeLeaveBase');
    }
    if (evt.type.startsWith('FEEDBACK_')) {
      const status = evt.title.replace(/^Customer Feedback\s*/, '').trim();
      return status
        ? t('activity.events.customerFeedback', { status: t(`activity.statuses.${status.toUpperCase()}`, status) })
        : t('activity.events.customerFeedbackBase');
    }
    if (evt.type.startsWith('CUSTOMER_')) return t('activity.events.customerUpdated');
    return evt.title;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('activity.title')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('activity.subtitle')}
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t(`activity.categories.${cat.id}`)}</span>
            </button>
          );
        })}
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">{t('activity.noEventsFound')}</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {t('activity.noEventsFoundDesc')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEvents.map((evt) => {
              const { color, icon: Icon } = getCategoryBadge(evt.category);

              return (
                <div
                  key={evt.id}
                  className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-2xl border ${color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">{getEventTitle(evt)}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{t('activity.byActor', { name: evt.actorName })}</span>
                      </div>
                      <p className="text-xs text-gray-600">{evt.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs text-gray-400 ps-11 sm:ps-0">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(evt.timestamp).toLocaleString(langLocale, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {evt.linkUrl && (
                      <Link
                        href={evt.linkUrl}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>{t('common.view')}</span>
                        <ExternalLink className="w-3 h-3 rtl-flip" />
                      </Link>
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
