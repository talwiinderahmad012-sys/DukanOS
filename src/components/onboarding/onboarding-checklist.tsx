'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Circle, 
  Package, 
  Users, 
  ShoppingBag, 
  ShoppingCart, 
  Sparkles, 
  X, 
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

interface OnboardingChecklistProps {
  businessName: string;
  hasProducts: boolean;
  hasCustomers: boolean;
  hasPurchases: boolean;
  hasSales: boolean;
}

export function OnboardingChecklist({
  businessName,
  hasProducts,
  hasCustomers,
  hasPurchases,
  hasSales,
}: OnboardingChecklistProps) {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const steps = [
    {
      id: 'business',
      title: t('onboarding.stepBusiness'),
      done: true,
      href: '/dashboard/settings/business',
      actionLabel: t('onboarding.stepBusinessAction'),
    },
    {
      id: 'product',
      title: t('onboarding.stepProduct'),
      done: hasProducts,
      href: '/dashboard/products/new',
      actionLabel: t('onboarding.stepProductAction'),
      icon: Package,
    },
    {
      id: 'customer',
      title: t('onboarding.stepCustomer'),
      done: hasCustomers,
      href: '/dashboard/customers',
      actionLabel: t('onboarding.stepCustomerAction'),
      icon: Users,
    },
    {
      id: 'purchase',
      title: t('onboarding.stepPurchase'),
      done: hasPurchases,
      href: '/dashboard/purchases/new',
      actionLabel: t('onboarding.stepPurchaseAction'),
      icon: ShoppingBag,
    },
    {
      id: 'sale',
      title: t('onboarding.stepSale'),
      done: hasSales,
      href: '/dashboard/pos',
      actionLabel: t('onboarding.stepSaleAction'),
      icon: ShoppingCart,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isAllDone = completedCount === steps.length;

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 rounded-2xl p-5 shadow-xs transition-all space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-sm shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {isAllDone ? t('onboarding.checklistDoneTitle') : t('onboarding.checklistTitle', { businessName })}
            </h2>
            <p className="text-xs text-gray-500">
              {isAllDone
                ? t('onboarding.checklistDoneSubtitle')
                : t('onboarding.checklistProgress', {
                    completed: completedCount,
                    total: steps.length,
                    percent: progressPercent,
                  })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-100/50 transition-colors"
            title={isCollapsed ? t('onboarding.expandChecklist') : t('onboarding.collapseChecklist')}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {isAllDone && (
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-blue-100/50 transition-colors"
              title={t('onboarding.dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!isAllDone && (
        <div className="w-full bg-blue-200/50 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {!isCollapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`p-3 rounded-xl border text-xs flex flex-col justify-between space-y-2 transition-all ${
                step.done
                  ? 'bg-white/80 border-emerald-200 text-gray-700'
                  : 'bg-white border-blue-200 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-2">
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                )}
                <span className={`font-medium ${step.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {step.title}
                </span>
              </div>

              {!step.done && (
                <Link
                  href={step.href}
                  className="inline-flex items-center justify-between text-[11px] font-semibold text-gray-900 hover:text-gray-950 bg-primary-soft/70 hover:bg-blue-100/70 py-1.5 px-2.5 rounded-lg transition-colors"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-3 h-3 rtl-flip" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
