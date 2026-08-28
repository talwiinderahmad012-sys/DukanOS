'use client';

import { exportToCSV } from '@/lib/utils/export-utils';
import { useTranslation } from '@/lib/i18n/language-context';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
}

export function ExportButton({ data, filename, label = 'Export CSV' }: ExportButtonProps) {
  const { t } = useTranslation();
  const resolvedLabel = label === 'Export CSV' ? t('charts.exportCsv') : label;

  return (
    <button
      onClick={() => exportToCSV(data, filename)}
      className="text-xs font-semibold text-gray-900 border border-blue-200 bg-primary-soft px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
    >
      {resolvedLabel}
    </button>
  );
}
