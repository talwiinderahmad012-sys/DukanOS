'use client';

import { useTranslation } from '@/lib/i18n/language-context';
import { CreatePayrollForm } from './create-payroll-form';

export function CreatePayrollView({ businessId }: { businessId: string }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('payroll.createPeriod')}</h1>
        <p className="text-xs text-gray-500 mt-1">
          {t('payroll.newSubtitle')}
        </p>
      </div>

      <CreatePayrollForm businessId={businessId} />
    </div>
  );
}
