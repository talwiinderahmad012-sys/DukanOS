'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { triggerAdvisorScanAction } from '@/app/actions/report.actions';

export function RefreshAdvisorButton({ businessId }: { businessId: string }) {
  const router = useRouter();
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
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Analyzing Business...' : success ? 'Advisor Synced!' : 'Run Advisor Scan'}
    </button>
  );
}
