'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  PurchaseForm,
  type SupplierOption,
  type ProductOption,
} from '@/components/purchases/purchase-form';
import { useTranslation } from '@/lib/i18n/language-context';

export function NewPurchaseClient({
  businessId,
  suppliers,
  initialProducts,
}: {
  businessId: string;
  suppliers: SupplierOption[];
  initialProducts: ProductOption[];
}) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label={t('purchases.breadcrumbAria')}>
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/dashboard/purchases" className="transition-colors hover:text-primary">
              {t('purchases.breadcrumbPurchases')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 rtl-flip text-gray-400" />
          </li>
          <li aria-current="page" className="font-medium text-gray-900">
            {t('purchases.newPurchaseBreadcrumb')}
          </li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('purchases.recordTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('purchases.recordDescription')}</p>
      </div>

      <PurchaseForm
        businessId={businessId}
        suppliers={suppliers}
        initialProducts={initialProducts}
      />
    </div>
  );
}
