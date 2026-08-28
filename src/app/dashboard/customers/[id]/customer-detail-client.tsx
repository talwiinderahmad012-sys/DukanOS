'use client';

import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import {
  CustomerProfileView,
  type AuditRow,
  type CustomerViewData,
  type InsightsView,
} from '@/components/customers/customer-profile-view';

export type CustomerViewDataSerial = CustomerViewData;
export type InsightsViewSerial = InsightsView;
export type AuditRowData = AuditRow;

export function CustomerDetailClient({
  businessId,
  customerName,
  data,
  insights,
  auditLogs,
  canManage,
  canPay,
}: {
  businessId: string;
  customerName: string;
  data: CustomerViewDataSerial;
  insights: InsightsViewSerial;
  auditLogs: AuditRowData[];
  canManage: boolean;
  canPay: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav aria-label={t('customers.breadcrumbAria')}>
        <ol className="flex items-center gap-2 text-sm text-muted">
          <li>
            <Link
              href="/dashboard/customers"
              className="flex items-center gap-1 font-medium hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 rtl-flip" aria-hidden="true" />
              {t('common.customers')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 rtl-flip text-gray-400" />
          </li>
          <li aria-current="page">
            <span className="font-semibold text-gray-900">{customerName}</span>
          </li>
        </ol>
      </nav>

      <CustomerProfileView
        businessId={businessId}
        data={data}
        insights={insights}
        auditLogs={auditLogs}
        canManage={canManage}
        canPay={canPay}
      />
    </div>
  );
}
