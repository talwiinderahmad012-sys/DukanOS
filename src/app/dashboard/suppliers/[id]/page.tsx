import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getSupplierWithPurchases } from '@/services/suppliers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
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

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const data = await getSupplierWithPurchases(business.id, id);
  if (!data) {
    notFound();
  }

  const { supplier, summary, purchases } = data;
  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const kpis = [
    {
      label: 'Total Volume',
      value: fmt(summary.totalSpend),
      sub: `${summary.totalPurchases} lifetime invoices`,
      Icon: DollarSign,
      iconWrap: 'bg-primary-soft text-primary',
      valueClass: 'text-gray-900',
    },
    {
      label: 'Total Cleared',
      value: fmt(summary.totalPaid),
      sub: 'Paid to vendor',
      Icon: Receipt,
      iconWrap: 'bg-success-soft text-success',
      valueClass: 'text-success',
    },
    {
      label: 'Balance Due',
      value: fmt(summary.remainingDue),
      sub: 'Payable / Credit',
      Icon: Receipt,
      iconWrap: 'bg-warning-soft text-warning',
      valueClass: summary.remainingDue > 0 ? 'text-warning' : 'text-gray-900',
    },
    {
      label: 'Last Purchase',
      value: summary.lastPurchaseDate ? formatDate(summary.lastPurchaseDate) : 'No purchases yet',
      sub: ' ',
      Icon: Calendar,
      iconWrap: 'bg-gray-50 text-gray-500',
      valueClass: 'text-gray-900',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/dashboard/suppliers" className="transition-colors hover:text-primary">
              Suppliers
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 text-gray-400" />
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
              {supplier.isActive ? 'Active Vendor' : 'Archived'}
            </Badge>
          </span>
        }
        description="Vendor profile & procurement history."
        actions={
          <>
            {canManage && (
              <SupplierManageButtons
                businessId={business.id}
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
              Record Purchase
            </Link>
          </>
        }
      />

      {/* Supplier Profile Card */}
      <Card padded>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
            <Truck className="h-7 w-7" />
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Phone</p>
                <p className="truncate font-medium text-gray-900">{supplier.phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Email</p>
                <p className="truncate font-medium text-gray-900">{supplier.email || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Address</p>
                <p className="truncate font-medium text-gray-900">{supplier.address || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {supplier.notes && (
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Notes: </span>
            {supplier.notes}
          </div>
        )}
      </Card>

      {/* Summary KPI Cards */}
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

      {/* Supplier Purchase History Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            Purchase History
          </h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {purchases.length} {purchases.length === 1 ? 'Invoice' : 'Invoices'}
          </span>
        </div>

        {purchases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No purchases yet"
            description="No purchases have been recorded with this supplier yet."
            action={
              <Link href="/dashboard/purchases/new" className={buttonClasses('primary', 'sm')}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Record Purchase
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <Table className="min-w-[720px] whitespace-nowrap">
              <TableHead>
                <tr>
                  <Th>Invoice #</Th>
                  <Th>Date</Th>
                  <Th className="text-center">Items</Th>
                  <Th className="text-right">Grand Total</Th>
                  <Th className="text-right">Paid</Th>
                  <Th className="text-right">Remaining</Th>
                  <Th className="text-center">Payment Status</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </TableHead>
              <tbody>
                {purchases.map((purchase) => {
                  const total = Number(purchase.total);
                  const paid = Number(purchase.paidAmount);
                  const remaining = Math.max(0, total - paid);

                  const isPaid = paid >= total && total > 0;
                  const isPartial = paid > 0 && paid < total;
                  const isCancelled = purchase.status === 'CANCELLED';

                  const paymentBadge: { label: string; tone: BadgeTone } = isPaid
                    ? { label: 'Paid', tone: 'success' }
                    : isPartial
                      ? { label: 'Partial', tone: 'warning' }
                      : { label: 'Unpaid', tone: 'danger' };

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
                          {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </Td>
                      <Td className="text-right font-medium text-gray-900">{fmt(total)}</Td>
                      <Td className="text-right font-medium text-success">{fmt(paid)}</Td>
                      <Td className="text-right">
                        <span className={remaining > 0 ? 'font-semibold text-warning' : 'text-muted'}>
                          {fmt(remaining)}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>
                      </Td>
                      <Td className="text-center">
                        <Badge tone={isCancelled ? 'neutral' : 'info'}>
                          {isCancelled ? 'Cancelled' : 'Received'}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <Link
                          href={`/dashboard/purchases/${purchase.id}`}
                          className="font-medium text-primary transition-colors hover:text-primary-hover"
                        >
                          View Details &rarr;
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
