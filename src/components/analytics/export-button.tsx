'use client';

import { exportToCSV } from '@/lib/utils/export-utils';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
}

export function ExportButton({ data, filename, label = 'Export CSV' }: ExportButtonProps) {
  return (
    <button
      onClick={() => exportToCSV(data, filename)}
      className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
    >
      {label}
    </button>
  );
}
