'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileJson,
  FileSpreadsheet,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { exportDataAction } from '@/app/actions/settings.actions';

const MODULE_LABEL_KEYS: Record<string, string> = {
  products: 'settingsAdmin.export.moduleProducts',
  customers: 'settingsAdmin.export.moduleCustomers',
  suppliers: 'settingsAdmin.export.moduleSuppliers',
  sales: 'settingsAdmin.export.moduleSales',
  purchases: 'settingsAdmin.export.modulePurchases',
  expenses: 'settingsAdmin.export.moduleExpenses',
  feedbacks: 'settingsAdmin.export.moduleFeedbacks',
};

export function DataExportView({
  businessId,
  isBackupPage = false,
}: {
  businessId: string;
  isBackupPage?: boolean;
}) {
  const { t, tm } = useTranslation();
  const [format, setFormat] = useState<'JSON' | 'CSV'>('JSON');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'products',
    'customers',
    'suppliers',
    'sales',
    'purchases',
    'expenses',
    'feedbacks',
  ]);

  const [exporting, setExporting] = useState(false);
  const [downloadReady, setDownloadReady] = useState<{ url: string; filename: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleModule = (mod: string) => {
    if (selectedModules.includes(mod)) {
      if (selectedModules.length > 1) {
        setSelectedModules(selectedModules.filter((m) => m !== mod));
      }
    } else {
      setSelectedModules([...selectedModules, mod]);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setErrorMsg(null);
    setDownloadReady(null);

    const res = await exportDataAction(businessId, {
      format,
      modules: selectedModules,
    });

    if (res.success && res.data) {
      const data = res.data as any;
      const blob = new Blob([data.data], {
        type: format === 'JSON' ? 'application/json' : 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      setDownloadReady({ url, filename: data.filename });
    } else {
      setErrorMsg(tm(res.message) || t('settingsAdmin.export.exportFailed'));
    }
    setExporting(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
          <span>{t('settingsAdmin.backToSettings')}</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isBackupPage ? t('settingsAdmin.export.backupTitle') : t('settingsAdmin.export.exportTitle')}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {isBackupPage
            ? t('settingsAdmin.export.backupDescription')
            : t('settingsAdmin.export.exportDescription')}
        </p>
      </div>

      {isBackupPage && (
        <div className="bg-primary-soft border border-blue-200 rounded-3xl p-5 text-xs text-blue-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <HardDrive className="w-4 h-4 text-gray-950" />
            <span>{t('settingsAdmin.export.backupArchitectureTitle')}</span>
          </div>
          <p className="leading-relaxed">
            {t('settingsAdmin.export.backupArchitectureBody1')}{' '}
            <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">pg_dump</code>{' '}
            {t('settingsAdmin.export.backupArchitectureBody2')}
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {downloadReady && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{t('settingsAdmin.export.exportSuccess')}</span>
          </div>
          <p className="text-xs text-emerald-800 font-mono">{downloadReady.filename}</p>
          <a
            href={downloadReady.url}
            download={downloadReady.filename}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{t('settingsAdmin.export.downloadFile')}</span>
          </a>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
        {/* Step 1: Format */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            {t('settingsAdmin.export.stepFormat')}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormat('JSON')}
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                format === 'JSON'
                  ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>{t('settingsAdmin.export.formatJson')}</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('CSV')}
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                format === 'CSV'
                  ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('settingsAdmin.export.formatCsv')}</span>
            </button>
          </div>
        </div>

        {/* Step 2: Modules */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            {t('settingsAdmin.export.stepModules')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 'products' },
              { id: 'customers' },
              { id: 'suppliers' },
              { id: 'sales' },
              { id: 'purchases' },
              { id: 'expenses' },
              { id: 'feedbacks' },
            ].map((m) => {
              const isSelected = selectedModules.includes(m.id);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModule(m.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-start flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-primary-soft/50 text-blue-900'
                      : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  <span>{t(MODULE_LABEL_KEYS[m.id])}</span>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      isSelected
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && '✓'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2 text-[11px] text-gray-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {t('settingsAdmin.export.securityNote')}
          </span>
        </div>

        {/* Export Button */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={handleExport}
            disabled={exporting || selectedModules.length === 0}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? t('settingsAdmin.export.generating') : t('settingsAdmin.export.generate')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
