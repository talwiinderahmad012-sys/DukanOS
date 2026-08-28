'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil } from 'lucide-react';
import { IconButton, buttonClasses, type ButtonSize } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { RecordPaymentModal } from './record-payment-modal';
import { CustomerEditDialog, type CustomerEditableData } from './customer-edit-dialog';
import { useTranslation } from '@/lib/i18n/language-context';

export type CustomerActionData = CustomerEditableData & {
  outstanding: number;
};

export function CustomerActions({
  businessId,
  customer,
  canPay,
  canManage,
  size = 'sm',
}: {
  businessId: string;
  customer: CustomerActionData;
  canPay: boolean;
  canManage: boolean;
  size?: ButtonSize;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { t } = useTranslation();

  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/dashboard/customers/${customer.id}`}
        aria-label={t('customers.viewLedgerAria', { name: customer.name })}
        title={t('customers.viewProfileLedger')}
        className={cn(
          buttonClasses('ghost', size),
          size === 'lg' ? 'h-10 w-10 p-0' : 'h-8 w-8 p-0',
        )}
      >
        <Eye className={iconSize} aria-hidden="true" />
      </Link>

      {canPay && (
        <RecordPaymentModal
          businessId={businessId}
          customerId={customer.id}
          customerName={customer.name}
          currentOutstanding={customer.outstanding}
          iconOnly
          variant="ghost"
          size={size}
        />
      )}

      {canManage && (
        <>
          <IconButton
            size={size}
            aria-label={t('customers.editAria', { name: customer.name })}
            title={t('common.edit')}
            onClick={() => setEditOpen(true)}
          >
            <Pencil className={iconSize} aria-hidden="true" />
          </IconButton>

          {editOpen && (
            <CustomerEditDialog
              businessId={businessId}
              customer={customer}
              onClose={() => setEditOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
