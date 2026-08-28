'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/language-context';

export type BarChartItem = {
  label: string;
  value1: number; // Primary (e.g. Revenue)
  value2?: number; // Secondary (e.g. Profit)
  value3?: number; // Tertiary (e.g. Expenses)
};

export function SimpleBarChart({
  data,
  height = 220,
  label1 = 'Revenue',
  label2 = 'Gross Profit',
  label3 = 'Expenses',
  color1 = '#aff33e', // blue
  color2 = '#16a34a', // green
  color3 = '#dc2626', // red
}: {
  data: BarChartItem[];
  height?: number;
  label1?: string;
  label2?: string;
  label3?: string;
  color1?: string;
  color2?: string;
  color3?: string;
}) {
  const { t, formatCurrency } = useTranslation();

  const resolveSeriesLabel = (value: string): string => {
    switch (value) {
      case 'Revenue':
        return t('charts.revenue');
      case 'Gross Profit':
        return t('charts.grossProfit');
      case 'Profit':
        return t('charts.profit');
      case 'Expenses':
        return t('charts.expenses');
      case 'Sales Revenue':
        return t('charts.salesRevenue');
      case 'Order Volume (x100)':
        return t('charts.orderVolume100');
      default:
        return value;
    }
  };

  const seriesLabel1 = resolveSeriesLabel(label1);
  const seriesLabel2 = resolveSeriesLabel(label2);
  const seriesLabel3 = resolveSeriesLabel(label3);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
        {t('charts.noChartData')}
      </div>
    );
  }

  // Find max value across datasets for dynamic scaling
  const maxValue = Math.max(
    ...data.flatMap((d) => [d.value1, d.value2 || 0, d.value3 || 0]),
    100
  );

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-gray-700">
          <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: color1 }} />
          <span>{seriesLabel1}</span>
        </div>
        {data.some((d) => d.value2 !== undefined) && (
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: color2 }} />
            <span>{seriesLabel2}</span>
          </div>
        )}
        {data.some((d) => d.value3 !== undefined) && (
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: color3 }} />
            <span>{seriesLabel3}</span>
          </div>
        )}
      </div>

      {/* Bar Columns Container */}
      <div
        className="w-full flex items-end justify-between gap-1 sm:gap-2 pt-6 border-b border-gray-200"
        style={{ height: `${height}px` }}
      >
        {data.map((item, idx) => {
          const h1 = Math.max(2, (item.value1 / maxValue) * (height - 40));
          const h2 =
            item.value2 !== undefined
              ? Math.max(2, (item.value2 / maxValue) * (height - 40))
              : 0;
          const h3 =
            item.value3 !== undefined
              ? Math.max(2, (item.value3 / maxValue) * (height - 40))
              : 0;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Tooltip on Hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-gray-900 text-white text-[11px] rounded-lg py-1.5 px-2.5 shadow-xl whitespace-nowrap z-20 pointer-events-none">
                <span className="font-bold border-b border-gray-700 pb-0.5 mb-1">
                  {item.label}
                </span>
                <span>{seriesLabel1}: {formatCurrency(item.value1)}</span>
                {item.value2 !== undefined && (
                  <span className="text-green-400">
                    {seriesLabel2}: {formatCurrency(item.value2)}
                  </span>
                )}
                {item.value3 !== undefined && (
                  <span className="text-red-400">
                    {seriesLabel3}: {formatCurrency(item.value3)}
                  </span>
                )}
              </div>

              {/* Bars Group */}
              <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 max-w-[40px]">
                <div
                  className="w-full rounded-t-sm transition-all hover:opacity-85"
                  style={{ height: `${h1}px`, backgroundColor: color1 }}
                />
                {item.value2 !== undefined && (
                  <div
                    className="w-full rounded-t-sm transition-all hover:opacity-85"
                    style={{ height: `${h2}px`, backgroundColor: color2 }}
                  />
                )}
                {item.value3 !== undefined && (
                  <div
                    className="w-full rounded-t-sm transition-all hover:opacity-85"
                    style={{ height: `${h3}px`, backgroundColor: color3 }}
                  />
                )}
              </div>

              {/* Label */}
              <span className="text-[10px] text-gray-500 mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
