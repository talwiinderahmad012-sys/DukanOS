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

const categories: { id: ActivityCategory | 'ALL'; label: string; icon: any }[] = [
  { id: 'ALL', label: 'All Activities', icon: Activity },
  { id: 'SALES', label: 'Sales & POS', icon: ShoppingCart },
  { id: 'INVENTORY', label: 'Inventory & Purchases', icon: Package },
  { id: 'STAFF', label: 'Staff & HR', icon: UserCheck },
  { id: 'CUSTOMER', label: 'Customers & Udhaar', icon: Users },
  { id: 'ADMIN', label: 'Administrative', icon: ShieldCheck },
];

export function ActivityFeedView({
  initialEvents,
}: {
  initialEvents: ActivityEvent[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'ALL'>('ALL');

  const filteredEvents = initialEvents.filter((e) =>
    selectedCategory === 'ALL' ? true : e.category === selectedCategory
  );

  const getCategoryBadge = (category: ActivityCategory) => {
    switch (category) {
      case 'SALES':
        return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShoppingCart };
      case 'INVENTORY':
        return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Package };
      case 'STAFF':
        return { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: UserCheck };
      case 'CUSTOMER':
        return { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Users };
      case 'ADMIN':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: ShieldCheck };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Center & Audit Stream</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Real-time chronological record of operational sales, inventory movements, staff management, and system events.
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
              <span>{cat.label}</span>
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
            <h3 className="text-base font-bold text-gray-900">No events found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No recent activity recorded for this category yet.
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
                        <span className="font-bold text-xs text-gray-900">{evt.title}</span>
                        <span className="text-[11px] text-gray-400 font-medium">by {evt.actorName}</span>
                      </div>
                      <p className="text-xs text-gray-600">{evt.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs text-gray-400 pl-11 sm:pl-0">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(evt.timestamp).toLocaleString(undefined, {
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
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
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
