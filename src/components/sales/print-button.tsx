'use client';

import { Printer } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/language-context';

export function PrintButton() {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonClasses('secondary', 'md', 'print:hidden')}
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      {t('sales.printInvoice')}
    </button>
  );
}
