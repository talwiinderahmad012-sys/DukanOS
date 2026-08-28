'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClasses } from '@/components/ui/button';
import { ProductForm } from '@/components/products/product-form';
import { useTranslation } from '@/lib/i18n/language-context';

export function NewProductPageClient({
  businessId,
  categories,
}: {
  businessId: string;
  categories: { id: string; name: string }[];
}) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div aria-label={t('products.breadcrumb')}>
        <nav aria-label={t('products.breadcrumb')}>
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/dashboard/products" className="transition-colors hover:text-primary">
                {t('common.products')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-gray-900">
              {t('products.newProduct')}
            </li>
          </ol>
        </nav>
      </div>

      <PageHeader
        title={t('products.addProduct')}
        description={t('products.addProductDescription')}
        actions={
          <Link href="/dashboard/products" className={buttonClasses('outline', 'sm')}>
            <ArrowLeft className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
            {t('products.backToProducts')}
          </Link>
        }
      />

      <ProductForm businessId={businessId} categories={categories} />
    </div>
  );
}
