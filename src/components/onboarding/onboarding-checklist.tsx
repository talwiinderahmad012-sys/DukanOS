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
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const steps = [
    {
      id: 'business',
      title: 'Create your business profile',
      done: true,
      href: '/dashboard/settings/business',
      actionLabel: 'Manage',
    },
    {
      id: 'product',
      title: 'Add your first product to inventory',
      done: hasProducts,
      href: '/dashboard/products/new',
      actionLabel: 'Add Product',
      icon: Package,
    },
    {
      id: 'customer',
      title: 'Add your first regular customer',
      done: hasCustomers,
      href: '/dashboard/customers',
      actionLabel: 'Add Customer',
      icon: Users,
    },
    {
      id: 'purchase',
      title: 'Record your first stock purchase',
      done: hasPurchases,
      href: '/dashboard/purchases/new',
      actionLabel: 'New Purchase',
      icon: ShoppingBag,
    },
    {
      id: 'sale',
      title: 'Ring up your first POS sale',
      done: hasSales,
      href: '/dashboard/pos',
      actionLabel: 'Open POS',
      icon: ShoppingCart,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isAllDone = completedCount === steps.length;

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 rounded-2xl p-5 shadow-xs transition-all space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {isAllDone ? "🎉 You're ready! Store setup complete." : `Getting Started with ${businessName}`}
            </h2>
            <p className="text-xs text-gray-500">
              {isAllDone
                ? 'All essential store setup steps are complete.'
                : `${completedCount} of ${steps.length} setup tasks completed (${progressPercent}%)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-100/50 transition-colors"
            title={isCollapsed ? 'Expand Checklist' : 'Collapse Checklist'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {isAllDone && (
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-blue-100/50 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isAllDone && (
        <div className="w-full bg-blue-200/50 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Steps List */}
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
                  className="inline-flex items-center justify-between text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 py-1.5 px-2.5 rounded-lg transition-colors"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
