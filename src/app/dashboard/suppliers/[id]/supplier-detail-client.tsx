'use client';

import Link from 'next/link';
import {
  ChevronRight,
  Truck,
  Phone,
  Mail,
  MapPin,
  Receipt,
  DollarSign,
  Calendar,
  Plus,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { cn } from '@/components/ui/cn';
import { SupplierManageButtons } from '@/components/suppliers/supplier-actions';
import { useTranslation } from '@/lib/i18n/language-context';

export type SupplierPurchaseRow = {
  id: string;
  invoiceNumber: string | null;
  purchaseDate: string;
  status: string;
  total: number;
  paidAmount: number;
  itemCount: number;
};

export type SupplierDetailViewData = {
  supplier: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
  };
  summary: {
    totalPurchases: number;
    totalSpend: number;
    totalPaid: number;
    remainingDue: number;
    lastPurchaseDate: string | null;
  };
  purchases: SupplierPurchaseRow[];
};

export function SupplierDetailClient({
  businessId,
  canManage,
  data,
}: {
  businessId: string;
  canManage: boolean;
  data: SupplierDetailViewData;
}) {
  const { t, formatCurrency, language } = useTranslation();
  const { supplier, summary, purchases } = data;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'UR' ? 'ur-PK' : 'en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const kpis = [
    {
      label: t('suppliers.totalVolume'),
      value: formatCurrency(summary.totalSpend),
      sub: t('suppliers.lifetimeInvoices', { count: summary.totalPurchases }),
      Icon: DollarSign,
      iconWrap: 'bg-primary-soft text-primary',
      valueClass: 'text-gray-900',
    },
    {
      label: t('suppliers.totalCleared'),
      value: formatCurrency(summary.totalPaid),
      sub: t('suppliers.paidToVendor'),
      Icon: Receipt,
      iconWrap: 'bg-success-soft text-success',
      valueClass: 'text-success',
    },
    {
      label: t('suppliers.balanceDue'),
      value: formatCurrency(summary.remainingDue),
      sub: t('suppliers.payableCredit'),
      Icon: Receipt,
      iconWrap: 'bg-warning-soft text-warning',
      valueClass: summary.remainingDue > 0 ? 'text-warning' : 'text-gray-900',
    },
    {
      label: t('suppliers.lastPurchase'),
      value: summary.lastPurchaseDate ? formatDate(summary.lastPurchaseDate) : t('suppliers.noPurchasesYet'),
      sub: ' ',
      Icon: Calendar,
      iconWrap: 'bg-gray-50 text-gray-500',
      valueClass: 'text-gray-900',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav aria-label={t('suppliers.breadcrumbAria')}>
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/dashboard/suppliers" className="transition-colors hover:text-primary">
              {t('common.suppliers')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 rtl-flip text-gray-400" />
          </li>
          <li aria-current="page" className="font-medium text-gray-900">
            {supplier.name}
          </li>
        </ol>
      </nav>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {supplier.name}
            <Badge tone={supplier.isActive ? 'success' : 'neutral'}>
              {supplier.isActive ? t('suppliers.activeVendor') : t('common.archived')}
            </Badge>
          </span>
        }
        description={t('suppliers.detailDescription')}
        actions={
          <>
            {canManage && (
              <SupplierManageButtons
                businessId={businessId}
                supplier={{
                  id: supplier.id,
                  name: supplier.name,
                  phone: supplier.phone,
                  email: supplier.email,
                  address: supplier.address,
                  notes: supplier.notes,
                  isActive: supplier.isActive,
                }}
                purchaseCount={summary.totalPurchases}
              />
            )}
            <Link href="/dashboard/purchases/new" className={buttonClasses('primary', 'sm')}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('suppliers.recordPurchase')}
            </Link>
          </>
        }
      />

      <Card padded>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
            <Truck className="h-7 w-7" />
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.phone')}</p>
                <p className="truncate font-medium text-gray-900">{supplier.phone || t('suppliers.notProvided')}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.email')}</p>
                <p className="truncate font-medium text-gray-900">{supplier.email || t('suppliers.notProvided')}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.address')}</p>
                <p className="truncate font-medium text-gray-900">{supplier.address || t('suppliers.notProvided')}</p>
              </div>
            </div>
          </div>
        </div>

        {supplier.notes && (
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">{t('suppliers.notesLabel')} </span>
            {supplier.notes}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="flex items-center justify-between p-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{kpi.label}</p>
              <h3 className={cn('mt-1 truncate text-2xl font-bold', kpi.valueClass)}>{kpi.value}</h3>
              {kpi.sub !== ' ' && <p className="mt-0.5 truncate text-xs text-muted">{kpi.sub}</p>}
            </div>
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', kpi.iconWrap)} aria-hidden="true">
              <kpi.Icon className="h-5 w-5" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('suppliers.purchaseHistory')}
          </h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {purchases.length === 1
              ? t('suppliers.invoiceSingular', { count: purchases.length })
              : t('suppliers.invoicePlural', { count: purchases.length })}
          </span>
        </div>

        {purchases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t('suppliers.noPurchasesYet')}
            description={t('suppliers.noPurchasesDescription')}
            action={
              <Link href="/dashboard/purchases/new" className={buttonClasses('primary', 'sm')}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('suppliers.recordPurchase')}
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <Table className="min-w-[720px] whitespace-nowrap">
              <TableHead>
                <tr>
                  <Th>{t('suppliers.invoiceNumber')}</Th>
                  <Th>{t('common.date')}</Th>
                  <Th className="text-center">{t('common.items')}</Th>
                  <Th className="text-end">{t('common.grandTotal')}</Th>
                  <Th className="text-end">{t('common.paid')}</Th>
                  <Th className="text-end">{t('suppliers.remaining')}</Th>
                  <Th className="text-center">{t('suppliers.paymentStatus')}</Th>
                  <Th className="text-center">{t('common.status')}</Th>
                  <Th className="text-end">{t('suppliers.tableAction')}</Th>
                </tr>
              </TableHead>
              <tbody>
                {purchases.map((purchase) => {
                  const remaining = Math.max(0, purchase.total - purchase.paidAmount);

                  const isPaid = purchase.paidAmount >= purchase.total && purchase.total > 0;
                  const isPartial = purchase.paidAmount > 0 && purchase.paidAmount < purchase.total;
                  const isCancelled = purchase.status === 'CANCELLED';

                  const paymentBadge: { label: string; tone: BadgeTone } = isPaid
                    ? { label: t('common.paid'), tone: 'success' }
                    : isPartial
                      ? { label: t('common.partial'), tone: 'warning' }
                      : { label: t('common.unpaid'), tone: 'danger' };

                  return (
                    <Tr key={purchase.id}>
                      <Td className="font-mono">
                        <Link
                          href={`/dashboard/purchases/${purchase.id}`}
                          className="flex items-center gap-1.5 text-primary hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                          {purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`}
                        </Link>
                      </Td>
                      <Td className="text-gray-600">{formatDate(purchase.purchaseDate)}</Td>
                      <Td className="text-center">
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {purchase.itemCount} {purchase.itemCount === 1 ? t('common.item') : t('common.items')}
                        </span>
                      </Td>
                      <Td className="text-end font-medium text-gray-900">{formatCurrency(purchase.total)}</Td>
                      <Td className="text-end font-medium text-success">{formatCurrency(purchase.paidAmount)}</Td>
                      <Td className="text-end">
                        <span className={remaining > 0 ? 'font-semibold text-warning' : 'text-muted'}>
                          {formatCurrency(remaining)}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>
                      </Td>
                      <Td className="text-center">
                        <Badge tone={isCancelled ? 'neutral' : 'info'}>
                          {isCancelled ? t('common.cancelled') : t('suppliers.received')}
                        </Badge>
                      </Td>
                      <Td className="text-end">
                        <Link
                          href={`/dashboard/purchases/${purchase.id}`}
                          className="font-medium text-primary transition-colors hover:text-primary-hover"
                        >
                          {t('common.viewDetails')}{' '}
                          <span className="inline-block rtl-flip" aria-hidden="true">
                            &rarr;
                          </span>
                        </Link>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
