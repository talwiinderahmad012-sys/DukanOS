'use client';

import Link from 'next/link';
import { 
  Store, 
  Building2, 
  ShoppingCart, 
  Package, 
  Receipt,
  FileText,
  Sparkles, 
  Bell, 
  Users, 
  MessageSquare, 
  Video, 
  ShieldCheck, 
  User, 
  Database, 
  Activity,
  ChevronRight
} from 'lucide-react';

export function SettingsHubView({
  isOwner,
  isManager,
}: {
  isOwner: boolean;
  isManager: boolean;
}) {
  const sections = [
    {
      title: 'Store & Operations',
      description: 'Business identity, branch locations, POS rules, and receipts',
      items: [
        {
          title: 'My Businesses',
          desc: 'Manage multiple stores, switch contexts, and add franchises',
          href: '/dashboard/settings/businesses',
          icon: Store,
          color: 'text-indigo-600 bg-indigo-50',
          ownerOnly: false,
        },
        {
          title: 'Business Profile',
          desc: 'Name, address, contact, currency, and timezone',
          href: '/dashboard/settings/business',
          icon: Store,
          color: 'text-blue-600 bg-blue-50',
          ownerOnly: true,
        },
        {
          title: 'Sales & POS Rules',
          desc: 'Discount caps, invoice prefixes, and credit policies',
          href: '/dashboard/settings/sales',
          icon: ShoppingCart,
          color: 'text-emerald-600 bg-emerald-50',
          ownerOnly: true,
        },
        {
          title: 'Inventory Settings',
          desc: 'Low stock thresholds, adjustment rules, and notifications',
          href: '/dashboard/settings/inventory',
          icon: Package,
          color: 'text-orange-600 bg-orange-50',
          ownerOnly: true,
        },
        {
          title: 'Invoice Settings',
          desc: 'Invoice display, logo, footer, and visibility options',
          href: '/dashboard/settings/invoices',
          icon: FileText,
          color: 'text-indigo-600 bg-indigo-50',
          ownerOnly: true,
        },
        {
          title: 'Receipts & Invoices',
          desc: 'Header, footer message, and feedback QR code toggle',
          href: '/dashboard/settings/receipts',
          icon: Receipt,
          color: 'text-purple-600 bg-purple-50',
          ownerOnly: true,
        },
      ],
    },
    {
      title: 'Intelligence & Alerts',
      description: 'Advisor thresholds, push notifications, and external gateway',
      items: [
        {
          title: 'Business Advisor',
          desc: 'Sales decline, slow moving, and credit risk thresholds',
          href: '/dashboard/settings/advisor',
          icon: Sparkles,
          color: 'text-amber-600 bg-amber-50',
          ownerOnly: true,
        },
        {
          title: 'Notifications & Alerts',
          desc: 'In-app, Web Push, and daily business digest alerts',
          href: '/dashboard/settings/notifications',
          icon: Bell,
          color: 'text-rose-600 bg-rose-50',
          ownerOnly: false,
        },
        {
          title: 'External Communications',
          desc: 'WhatsApp Cloud API, SMS, and Email integrations',
          href: '/dashboard/settings/communications',
          icon: MessageSquare,
          color: 'text-indigo-600 bg-indigo-50',
          ownerOnly: true,
        },
        {
          title: 'Security Cameras (CCTV)',
          desc: 'IP cameras, NVR channels, and remote monitoring feeds',
          href: '/dashboard/cameras',
          icon: Video,
          color: 'text-teal-600 bg-teal-50',
          ownerOnly: false,
        },
      ],
    },
    {
      title: 'Team, Security & Account',
      description: 'Team permissions, password, personal profile, and safety',
      items: [
        {
          title: 'Team & Members',
          desc: 'Manage roles (Manager, Cashier, Staff) with owner protection',
          href: '/dashboard/settings/members',
          icon: Users,
          color: 'text-sky-600 bg-sky-50',
          ownerOnly: true,
        },
        {
          title: 'Security & Password',
          desc: 'Change login password and account security settings',
          href: '/dashboard/settings/security',
          icon: ShieldCheck,
          color: 'text-green-600 bg-green-50',
          ownerOnly: false,
        },
        {
          title: 'Personal Profile',
          desc: 'Your display name, phone number, and contact info',
          href: '/dashboard/settings/profile',
          icon: User,
          color: 'text-gray-600 bg-gray-50',
          ownerOnly: false,
        },
      ],
    },
    {
      title: 'Data & System Health',
      description: 'Data exports, backup architecture, and system diagnostics',
      items: [
        {
          title: 'Data Export',
          desc: 'Export business catalog, sales, customers (CSV / JSON)',
          href: '/dashboard/settings/data-export',
          icon: Database,
          color: 'text-orange-600 bg-orange-50',
          ownerOnly: true,
        },
        {
          title: 'Backup & Recovery',
          desc: 'Application snapshot and database backup recovery guide',
          href: '/dashboard/settings/backup',
          icon: Database,
          color: 'text-cyan-600 bg-cyan-50',
          ownerOnly: true,
        },
        {
          title: 'System Information & Health',
          desc: 'Database latency, service health, and software diagnostics',
          href: '/dashboard/settings/system',
          icon: Activity,
          color: 'text-slate-600 bg-slate-50',
          ownerOnly: false,
        },
      ],
    },
    {
      title: 'Plan & Resource Limits',
      description: 'Active subscription tier, feature entitlements, and quota metrics',
      items: [
        {
          title: 'Plan & Entitlements',
          desc: 'Current free tier, included features, and commercial capabilities',
          href: '/dashboard/settings/plan',
          icon: Sparkles,
          color: 'text-blue-600 bg-blue-50',
          ownerOnly: false,
        },
        {
          title: 'Resource Usage & Quotas',
          desc: 'Real-time database records, product quotas, and monthly usage',
          href: '/dashboard/settings/usage',
          icon: Activity,
          color: 'text-emerald-600 bg-emerald-50',
          ownerOnly: false,
        },
        {
          title: 'Platform Governance (Admin)',
          desc: 'Inspect system-wide plan definitions and feature flags',
          href: '/dashboard/platform/plans',
          icon: ShieldCheck,
          color: 'text-indigo-600 bg-indigo-50',
          ownerOnly: true,
        },
      ],
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System & Business Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Configure business rules, manage team roles, adjust advisor thresholds, and control data.
        </p>
      </div>

      {/* Sections Grid */}
      <div className="space-y-8">
        {sections.map((section) => {
          // Filter items based on owner permission
          const visibleItems = section.items.filter(
            (item) => !item.ownerOnly || isOwner
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{section.title}</h2>
                <p className="text-xs text-gray-500">{section.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.color}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
