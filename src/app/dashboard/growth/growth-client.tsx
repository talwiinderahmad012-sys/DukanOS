'use client';

import Link from 'next/link';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';

import { useTranslation } from '@/lib/i18n/language-context';

export type GrowthPeriodParam = 'DAILY' | 'MONTHLY' | 'YEARLY';

export type GrowthMetricData = {
  current: number;
  previous: number;
  percentage: number | null;
  status: string;
};

export type GrowthChartDay = {
  day: number;
  revenue: number;
  profit: number;
};

export function GrowthPageClient({
  periodParam,
  revenue,
  grossProfit,
  netProfit,
  orders,
  chartData,
}: {
  periodParam: GrowthPeriodParam;
  revenue: GrowthMetricData;
  grossProfit: GrowthMetricData;
  netProfit: GrowthMetricData;
  orders: GrowthMetricData;
  chartData: GrowthChartDay[];
}) {
  const { t, formatCurrency, formatNumber } = useTranslation();

  const money = (n: number) => formatCurrency(Math.round(n));

  const tabs: { id: GrowthPeriodParam; label: string }[] = [
    { id: 'DAILY', label: t('growth.tabDayOverDay') },
    { id: 'MONTHLY', label: t('growth.tabMonthOverMonth') },
    { id: 'YEARLY', label: t('growth.tabYearOverYear') },
  ];

  const formatGrowth = (g: GrowthMetricData): string => {
    if (g.status === 'NO_BASELINE' || g.status === 'NEW') return t('growth.newGrowth');
    if (g.status === 'UP') return t('growth.upPercent', { value: (g.percentage ?? 0).toFixed(1) });
    if (g.status === 'DOWN') return t('growth.downPercent', { value: (g.percentage ?? 0).toFixed(1) });
    return t('growth.flatGrowth');
  };

  const metrics = [
    {
      label: t('growth.revenueGrowth'),
      growth: revenue,
      current: money(revenue.current),
      prev: money(revenue.previous),
      desc: t('growth.revenueGrowthDesc'),
    },
    {
      label: t('growth.grossProfitGrowth'),
      growth: grossProfit,
      current: money(grossProfit.current),
      prev: money(grossProfit.previous),
      desc: t('growth.grossProfitGrowthDesc'),
    },
    {
      label: t('growth.netProfitGrowth'),
      growth: netProfit,
      current: money(netProfit.current),
      prev: money(netProfit.previous),
      desc: t('growth.netProfitGrowthDesc'),
    },
    {
      label: t('growth.orderVolumeGrowth'),
      growth: orders,
      current: t('growth.ordersValue', { count: formatNumber(orders.current) }),
      prev: t('growth.ordersValue', { count: formatNumber(orders.previous) }),
      desc: t('growth.orderVolumeGrowthDesc'),
    },
  ];

  const chartItems = chartData.map((d) => ({
    label: t('growth.dayNumber', { day: d.day }),
    value1: d.revenue,
    value2: d.profit,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('growth.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('growth.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/dashboard/growth?period=${tab.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodParam === tab.id
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((item, idx) => {
          const isUp = item.growth.status === 'UP';
          const isDown = item.growth.status === 'DOWN';

          return (
            <SurfaceCard key={item.label} className="p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{item.label}</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      isUp
                        ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300'
                        : isDown
                        ? 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {isUp && <TrendingUp className="w-3.5 h-3.5 rtl-flip" />}
                    {isDown && <TrendingDown className="w-3.5 h-3.5 rtl-flip" />}
                    {formatGrowth(item.growth)}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mt-2">
                  {item.current}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t('growth.previousValue', { value: item.prev })}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-white/10 text-[11px] text-gray-500 flex justify-between items-center">
                <span>{item.desc}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{tabs.find((tab) => tab.id === periodParam)?.label}</span>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      <SurfaceCard className="rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/10 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t('growth.trajectoryTitle')}</h3>
            <p className="text-xs text-gray-500">{t('growth.trajectoryDescription')}</p>
          </div>
          <Link
            href="/dashboard/reports/monthly"
            className="text-xs text-gray-900 hover:underline font-semibold flex items-center gap-1"
          >
            {t('growth.fullReports')}
            <ArrowRight className="w-3.5 h-3.5 rtl-flip" aria-hidden="true" />
          </Link>
        </div>

        <SimpleBarChart
          data={chartItems}
          height={220}
          label1={t('growth.revenueLegend')}
          label2={t('growth.grossProfitLegend')}
          color1="#aff33e"
          color2="#16a34a"
        />
      </SurfaceCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SurfaceCard className="p-5 rounded-2xl space-y-2">
          <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm">{t('growth.scalabilityTitle')}</h4>
          <p className="text-xs text-gray-900 dark:text-gray-200 leading-relaxed">
            {t('growth.scalabilityDesc')}
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-5 rounded-2xl space-y-2">
          <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">{t('growth.marginTitle')}</h4>
          <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
            {t('growth.marginDesc')}
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-5 rounded-2xl space-y-2">
          <h4 className="font-bold text-purple-900 dark:text-purple-200 text-sm">{t('growth.capitalTitle')}</h4>
          <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
            {t('growth.capitalDesc')}
          </p>
        </SurfaceCard>
      </div>
    </div>
  );
}
