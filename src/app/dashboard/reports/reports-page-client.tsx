'use client';

import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  ChevronRight,
  Package,
  AlertTriangle,
  Receipt,
  Layers,
  Users,
  Truck,
  FileText,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';
import { useTranslation } from '@/lib/i18n/language-context';
import ReportFilters from './report-filters';

export type BranchOption = { id: string; name: string };

export type MonthSnapshotData = {
  year: number;
  month: number;
  grossRevenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  ordersCount: number;
};

export type DailyTrendPoint = { day: number; revenue: number; profit: number; expenses: number };

export type TopProductData = {
  productId: string;
  name: string;
  unit: string;
  currentStock: number;
  quantitySold: number;
  revenue: number;
};

export type SlowProductData = {
  productId: string;
  name: string;
  unit: string;
  currentStock: number;
  stockValue: number;
};

const REPORT_CATEGORIES = [
  {
    type: 'SALES',
    titleKey: 'reports.salesReport',
    descKey: 'reports.salesReportDesc',
    href: '/dashboard/reports/report?type=SALES',
    icon: Receipt,
    color: 'bg-primary-soft text-gray-900 border-blue-100',
  },
  {
    type: 'PROFIT',
    titleKey: 'reports.profitReport',
    descKey: 'reports.profitReportDesc',
    href: '/dashboard/reports/report?type=PROFIT',
    icon: TrendingUp,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    type: 'PURCHASES',
    titleKey: 'reports.purchaseReport',
    descKey: 'reports.purchaseReportDesc',
    href: '/dashboard/reports/report?type=PURCHASES',
    icon: Truck,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    type: 'INVENTORY',
    titleKey: 'reports.inventoryReport',
    descKey: 'reports.inventoryReportDesc',
    href: '/dashboard/reports/report?type=INVENTORY',
    icon: Package,
    color: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  {
    type: 'EXPENSES',
    titleKey: 'reports.expenseReport',
    descKey: 'reports.expenseReportDesc',
    href: '/dashboard/reports/report?type=EXPENSES',
    icon: FileText,
    color: 'bg-red-50 text-red-600 border-red-100',
  },
  {
    type: 'CUSTOMERS',
    titleKey: 'reports.customersReport',
    descKey: 'reports.customersReportDesc',
    href: '/dashboard/reports/report?type=CUSTOMERS',
    icon: Users,
    color: 'bg-teal-50 text-teal-600 border-teal-100',
  },
  {
    type: 'BRANCHES',
    titleKey: 'reports.branchesReport',
    descKey: 'reports.branchesReportDesc',
    href: '/dashboard/reports/report?type=BRANCHES',
    icon: BarChart3,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  {
    type: 'PAYROLL',
    titleKey: 'reports.payrollReport',
    descKey: 'reports.payrollReportDesc',
    href: '/dashboard/reports/report?type=PAYROLL',
    icon: UserCheck,
    color: 'bg-orange-50 text-orange-600 border-orange-100',
  },
  {
    type: 'BUSINESS_GROWTH',
    titleKey: 'reports.growthReport',
    descKey: 'reports.growthReportDesc',
    href: '/dashboard/reports/report?type=BUSINESS_GROWTH',
    icon: Briefcase,
    color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  },
];

export function ReportsPageClient({
  businessId,
  snapshot,
  dailyTrend,
  topProducts,
  slowProducts,
  branches,
}: {
  businessId: string;
  snapshot: MonthSnapshotData;
  dailyTrend: DailyTrendPoint[];
  topProducts: TopProductData[];
  slowProducts: SlowProductData[];
  branches: BranchOption[];
}) {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const locale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const monthName = new Date(snapshot.year, snapshot.month - 1, 1).toLocaleDateString(locale, { month: 'long' });

  const chartData = dailyTrend.map((d) => ({
    label: t('reports.dayNumber', { day: d.day }),
    value1: d.revenue,
    value2: d.profit,
    value3: d.expenses,
  }));

  const marginPercent =
    snapshot.grossRevenue > 0
      ? Math.round((snapshot.grossProfit / snapshot.grossRevenue) * 100)
      : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reports.hubTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {t('reports.hubSubtitle')}
          </p>
        </div>
        <ReportFilters businessId={businessId} branches={branches} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CATEGORIES.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.type}
              href={item.href}
              className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base group-hover:text-gray-900 transition-colors">
                  {t(item.titleKey)}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t(item.descKey)}</p>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-900">
                <span>{t('reports.generateReport')}</span>
                <ChevronRight className="w-4 h-4 rtl-flip group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {t('reports.monthSnapshot', { month: monthName, year: snapshot.year })}
            </h2>
            <p className="text-xs text-gray-500">{t('reports.snapshotDesc')}</p>
          </div>
          <Link
            href="/dashboard/reports/monthly"
            className="text-xs text-gray-900 hover:underline font-semibold flex items-center gap-1"
          >
            {t('reports.viewFullMonth')} <span className="inline-block rtl-flip" aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 font-medium">{t('reports.grossRevenue')}</span>
            <h4 className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(snapshot.grossRevenue)}
            </h4>
            <span className="text-[11px] text-gray-400">{t('reports.ordersCaption', { count: formatNumber(snapshot.ordersCount) })}</span>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100">
            <span className="text-xs text-emerald-800 font-medium">{t('reports.grossProfit')}</span>
            <h4 className="text-xl font-bold text-emerald-700 mt-1">
              {formatCurrency(snapshot.grossProfit)}
            </h4>
            <span className="text-[11px] text-emerald-600">
              {t('reports.marginValue', { value: marginPercent })}
            </span>
          </div>

          <div className="p-4 bg-red-50/70 rounded-xl border border-red-100">
            <span className="text-xs text-red-800 font-medium">{t('reports.expenses')}</span>
            <h4 className="text-xl font-bold text-red-700 mt-1">
              {formatCurrency(snapshot.expenses)}
            </h4>
            <span className="text-[11px] text-red-600">{t('reports.storeOverheads')}</span>
          </div>

          <div className="p-4 bg-primary-soft/70 rounded-xl border border-blue-100">
            <span className="text-xs text-gray-900 font-medium">{t('reports.netProfitLabel')}</span>
            <h4 className="text-xl font-bold text-gray-950 mt-1">
              {formatCurrency(snapshot.netProfit)}
            </h4>
            <span className="text-[11px] text-gray-900">{t('reports.profitAfterExpenses')}</span>
          </div>
        </div>

        <div className="pt-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{t('reports.dailyTrendFirstHalf')}</h4>
          <SimpleBarChart
            data={chartData}
            height={200}
            label1={t('reports.revenue')}
            label2={t('reports.grossProfit')}
            label3={t('reports.expenses')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-900" /> {t('reports.topSellingItems')}
            </h3>
            <span className="text-xs text-gray-400">{t('reports.byQuantitySold')}</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">{t('reports.noSalesDataYet')}</div>
          ) : (
            <div className="divide-y divide-gray-100 text-sm">
              {topProducts.map((p, idx) => (
                <div key={p.productId} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-soft text-gray-950 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{t('reports.stockCaption', { count: formatNumber(p.currentStock), unit: p.unit })}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="font-bold text-gray-900">{formatNumber(p.quantitySold)} {p.unit}</span>
                    <span className="block text-xs text-green-600">{formatCurrency(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> {t('reports.slowMovingInventory')}
            </h3>
            <span className="text-xs text-gray-400">{t('reports.daysWithoutSales')}</span>
          </div>

          {slowProducts.length === 0 ? (
            <div className="py-8 text-center text-green-600 text-xs font-medium">
              {t('reports.noSlowMovingItems')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-sm">
              {slowProducts.map((p) => (
                <div key={p.productId} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{t('reports.inStockCaption', { count: formatNumber(p.currentStock), unit: p.unit })}</p>
                  </div>
                  <div className="text-end">
                    <span className="font-bold text-amber-700">{formatCurrency(Math.round(p.stockValue))}</span>
                    <span className="block text-xs text-gray-400">{t('reports.tiedUpCapital')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
