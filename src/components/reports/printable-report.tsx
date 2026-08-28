'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/language-context';

interface PrintableReportProps {
  businessName: string;
  reportTitle: string;
  dateRange: { from: string; to: string };
  branchName?: string;
  generatedAt: string;
  summary: Record<string, number | string | boolean | null>;
  rows: Record<string, unknown>[];
  totals: Record<string, number>;
}

const METRIC_VALUE_KEYS: Record<string, string> = {
  'Total Units': 'reports.fields.totalUnits',
  'Total Value': 'reports.fields.totalValue',
  'Low Stock Value': 'reports.fields.lowStockValue',
  'Dead Stock Value': 'reports.fields.deadStockValue',
  'Out of Stock': 'reports.fields.outOfStock',
  'Critical Stock': 'reports.fields.criticalStock',
  'Low Stock': 'reports.fields.lowStock',
  'Healthy Stock': 'reports.fields.healthyStock',
};

const ENUM_VALUE_KEYS: Record<string, string> = {
  CASH: 'sales.payCash',
  CARD: 'sales.payCard',
  BANK_TRANSFER: 'sales.payBankTransfer',
  MOBILE_WALLET: 'sales.payMobileWallet',
  CREDIT: 'sales.payCredit',
  GROWING: 'reports.fields.trendGrowing',
  STABLE: 'reports.fields.trendStable',
  DECLINING: 'reports.fields.trendDeclining',
  LOW: 'common.low',
  MEDIUM: 'common.medium',
  HIGH: 'common.high',
  up: 'reports.fields.directionUp',
  down: 'reports.fields.directionDown',
  flat: 'reports.fields.directionFlat',
};

function prettifyKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').trim();
}

export function PrintableReport({
  businessName,
  reportTitle,
  dateRange,
  branchName,
  generatedAt,
  summary,
  rows,
  totals,
}: PrintableReportProps) {
  const { t, formatCurrency } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const fieldLabel = (key: string): string => t(`reports.fields.${key}`, prettifyKey(key));

  const formatValue = (value: unknown): string => {
    if (typeof value === 'number') return formatCurrency(value);
    if (typeof value === 'string') {
      const key = METRIC_VALUE_KEYS[value] || ENUM_VALUE_KEYS[value];
      return key ? t(key) : value;
    }
    return String(value ?? '');
  };

  const summaryEntries = Object.entries(summary).filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <div className="print:p-0">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible;
          }
          #printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>
      <div id="printable-report-area" ref={printRef} className="max-w-3xl mx-auto bg-white p-8 shadow-sm border border-gray-200 rounded-none print:shadow-none print:border-none">
        <header className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{businessName}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('reports.businessReportDoc')}</p>
            </div>
            <div className="text-end text-xs text-gray-500">
              <p>{t('reports.generated')}: {generatedAt}</p>
              {branchName && <p>{t('reports.branch')}: {branchName}</p>}
              <p>
                {dateRange.from} {dateRange.to !== dateRange.from ? `${t('reports.dateTo')} ${dateRange.to}` : ''}
              </p>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mt-4">{reportTitle}</h2>
        </header>

        {summaryEntries.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('common.summary')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {summaryEntries.map(([key, value]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    {fieldLabel(key)}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {formatValue(value)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {rows.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('common.details')}</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-start text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {Object.keys(rows[0]).map((header) => (
                      <th key={header} className="px-3 py-2 border-b border-gray-200">
                        {fieldLabel(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {formatValue(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {Object.keys(totals).length > 0 && (
          <section className="mb-6">
            <div className="border-t-2 border-gray-900 pt-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('reports.totals')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(totals).map(([key, value]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                      {fieldLabel(key)}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {formatValue(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <footer className="border-t border-gray-200 pt-4 mt-6 text-[10px] text-gray-400 text-center">
          {t('reports.printFooter', { date: generatedAt })}
        </footer>
      </div>
    </div>
  );
}
