'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { triggerAdvisorScanAction } from '@/app/actions/report.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function RefreshAdvisorButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      await triggerAdvisorScanAction(businessId);
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleScan}
      disabled={loading}
      className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      {loading ? t('advisor.analyzing') : success ? t('advisor.synced') : t('advisor.runScan')}
    </button>
  );
}
