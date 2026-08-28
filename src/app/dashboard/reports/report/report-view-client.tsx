'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { PrintableReport } from '@/components/reports/printable-report';
import { ExportButton } from '@/components/analytics/export-button';
import { useTranslation } from '@/lib/i18n/language-context';

export type ReportResultData = {
  type: string;
  title: string;
  dateRange: { from: string; to: string };
  generatedAt: string;
  summary: Record<string, number | string | boolean | null>;
  rows: Record<string, unknown>[];
  totals: Record<string, number>;
};

export type ReportErrorData = { errorCode: string | null; message: string | null };

const TITLE_KEYS: Record<string, string> = {
  'Sales Report': 'reports.salesReport',
  'Profit Report': 'reports.profitReport',
  'Purchase Report': 'reports.purchaseReport',
  'Inventory Valuation Report': 'reports.inventoryValuationReport',
  'Expense Report': 'reports.expenseReport',
  'Customer & Udhaar Report': 'reports.customersReport',
  'Branch Performance Report': 'reports.branchesReport',
  'Payroll Summary Report': 'reports.payrollReport',
  'Business Growth Report': 'reports.growthReport',
};

export function ReportViewClient({
  businessName,
  branchName,
  report,
  error,
}: {
  businessName: string;
  branchName?: string;
  report?: ReportResultData;
  error?: ReportErrorData;
}) {
  const { t, tm } = useTranslation();

  if (!report || error) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-red-600 text-sm">
          {t('reports.failedToGenerate')}: {tm(error?.errorCode || 'Unknown')} — {tm(error?.message || '')}
        </p>
        <Link href="/dashboard/reports" className="text-gray-900 text-sm mt-4 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4 rtl-flip" /> {t('reports.backToReports')}
        </Link>
      </div>
    );
  }

  const reportTitle = TITLE_KEYS[report.title] ? t(TITLE_KEYS[report.title]) : report.title;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-gray-500 hover:text-gray-900" aria-label={t('reports.backToReports')}>
            <ArrowLeft className="w-5 h-5 rtl-flip" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{reportTitle}</h1>
            <p className="text-xs text-gray-500">
              {report.dateRange.from} {report.dateRange.to !== report.dateRange.from ? `${t('reports.dateTo')} ${report.dateRange.to}` : ''}
              {branchName && ` • ${branchName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={report.rows} filename={`${report.type.toLowerCase()}-report`} label={t('reports.exportCsv')} />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            {t('reports.printPdf')}
          </button>
        </div>
      </div>

      <PrintableReport
        businessName={businessName}
        reportTitle={reportTitle}
        dateRange={report.dateRange}
        branchName={branchName}
        generatedAt={report.generatedAt}
        summary={report.summary}
        rows={report.rows}
        totals={report.totals}
      />
    </div>
  );
}
