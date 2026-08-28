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
import { useTranslation } from '@/lib/i18n/language-context';

export function SettingsHubView({
  isOwner,
  isManager,
}: {
  isOwner: boolean;
  isManager: boolean;
}) {
  const { t, language, setLanguage } = useTranslation();

  const sections = [
    {
      title: t('settings.sectionStoreOperations'),
      description: t('settings.sectionStoreOperationsDesc'),
      items: [
        {
          title: t('settings.myBusinesses'),
          desc: t('settings.myBusinessesDesc'),
          href: '/dashboard/settings/businesses',
          icon: Store,
          color: 'text-indigo-600 bg-indigo-50',
          ownerOnly: false,
        },
        {
          title: t('settings.branches'),
          desc: t('settings.branchesDescription'),
          href: '/dashboard/settings/branches',
          icon: Building2,
          color: 'text-blue-600 bg-blue-50',
          ownerOnly: false,
        },
        {
          title: t('settings.businessProfile'),
          desc: t('settings.businessProfileCardDesc'),
          href: '/dashboard/settings/business',
          icon: Store,
          color: 'text-gray-900 bg-primary-soft',
          ownerOnly: true,
        },
        {
          title: t('settings.salesPosRules'),
          desc: t('settings.salesPosRulesDesc'),
          href: '/dashboard/settings/sales',
          icon: ShoppingCart,
          color: 'text-emerald-600 bg-emerald-50',
          ownerOnly: true,
        },
        {
          title: t('settings.inventorySettings'),
          desc: t('settings.inventoryCardDesc'),
          href: '/dashboard/settings/inventory',
          icon: Package,
          color: 'text-orange-600 bg-orange-50',
          ownerOnly: true,
        },
        {
          title: t('settings.invoiceSettings'),
          desc: t('settings.invoiceCardDesc'),
          href: '/dashboard/settings/invoices',
          icon: FileText,
          color: 'text-indigo-600 bg-indigo-50',
          ownerOnly: true,
        },
        {
          title: t('settings.receiptsAndInvoices'),
          desc: t('settings.receiptsCardDesc'),
          href: '/dashboard/settings/receipts',
          icon: Receipt,
          color: 'text-purple-600 bg-purple-50',
          ownerOnly: true,
        },
      ],
    },
    {
      title: t('settings.sectionIntelligenceAlerts'),
      description: t('settings.sectionIntelligenceAlertsDesc'),
      items: [
        {
          title: t('settings.advisorCardTitle'),
          desc: t('settings.advisorCardDesc'),
          href: '/dashboard/settings/advisor',
          icon: Sparkles,
          color: 'text-amber-600 bg-amber-50',
          ownerOnly: true,
        },
        {
          title: t('settings.notificationsAlerts'),
          desc: t('settings.notificationsAlertsDesc'),
          href: '/dashboard/settings/notifications',
          icon: Bell,
          color: 'text-rose-600 bg-rose-50',
          ownerOnly: false,
        },
        {
          title: t('settings.externalCommunications'),
          desc: t('settings.externalCommunicationsDesc'),
          href: '/dashboard/communications',
          icon: MessageSquare,
          color: 'text-indigo-600 bg-indigo-50',
          ownerOnly: true,
        },
        {
          title: t('settings.securityCameras'),
          desc: t('settings.securityCamerasDesc'),
          href: '/dashboard/cameras',
          icon: Video,
          color: 'text-teal-600 bg-teal-50',
          ownerOnly: false,
        },
      ],
    },
    {
      title: t('settings.sectionTeamSecurity'),
      description: t('settings.sectionTeamSecurityDesc'),
      items: [
        {
          title: t('settings.teamMembers'),
          desc: t('settings.teamMembersDesc'),
          href: '/dashboard/settings/members',
          icon: Users,
          color: 'text-sky-600 bg-sky-50',
          ownerOnly: true,
        },
        {
          title: t('settings.securityPassword'),
          desc: t('settings.securityPasswordDesc'),
          href: '/dashboard/settings/security',
          icon: ShieldCheck,
          color: 'text-green-600 bg-green-50',
          ownerOnly: false,
        },
        {
          title: t('settings.personalProfile'),
          desc: t('settings.personalProfileDesc'),
          href: '/dashboard/settings/profile',
          icon: User,
          color: 'text-gray-600 bg-gray-50',
          ownerOnly: false,
        },
      ],
    },
    {
      title: t('settings.sectionDataSystem'),
      description: t('settings.sectionDataSystemDesc'),
      items: [
        {
          title: t('settings.dataExport'),
          desc: t('settings.dataExportCardDesc'),
          href: '/dashboard/settings/data-export',
          icon: Database,
          color: 'text-orange-600 bg-orange-50',
          ownerOnly: true,
        },
        {
          title: t('settings.backupRecovery'),
          desc: t('settings.backupRecoveryDesc'),
          href: '/dashboard/settings/backup',
          icon: Database,
          color: 'text-cyan-600 bg-cyan-50',
          ownerOnly: true,
        },
        {
          title: t('settings.systemInfoHealth'),
          desc: t('settings.systemInfoHealthDesc'),
          href: '/dashboard/settings/system',
          icon: Activity,
          color: 'text-slate-600 bg-slate-50',
          ownerOnly: false,
        },
      ],
    },
    {
      title: t('settings.sectionPlanResources'),
      description: t('settings.sectionPlanResourcesDesc'),
      items: [
        {
          title: t('settings.planEntitlements'),
          desc: t('settings.planEntitlementsDesc'),
          href: '/dashboard/settings/plan',
          icon: Sparkles,
          color: 'text-gray-900 bg-primary-soft',
          ownerOnly: false,
        },
        {
          title: t('settings.resourceUsage'),
          desc: t('settings.resourceUsageDesc'),
          href: '/dashboard/settings/usage',
          icon: Activity,
          color: 'text-emerald-600 bg-emerald-50',
          ownerOnly: false,
        },
        {
          title: t('settings.platformGovernance'),
          desc: t('settings.platformGovernanceDesc'),
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.hubHeading')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('settings.hubHeadingDescription')}
          </p>
        </div>

        <div
          role="group"
          aria-label={t('common.language')}
          className="flex items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-xs"
        >
          <button
            type="button"
            onClick={() => setLanguage('EN')}
            aria-pressed={language === 'EN'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              language === 'EN'
                ? 'bg-primary text-on-primary'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('common.english')}
          </button>
          <button
            type="button"
            onClick={() => setLanguage('UR')}
            aria-pressed={language === 'UR'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              language === 'UR'
                ? 'bg-primary text-on-primary'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('common.urdu')}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((section) => {
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
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors rtl-flip" />
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-gray-900 group-hover:text-gray-900 transition-colors">
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
