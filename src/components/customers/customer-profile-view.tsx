'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  MapPin,
  FileText,
  Package,
  Star,
  Activity,
  ShoppingCart,
  Pencil,
  Copy,
  Plus,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { RecordPaymentModal } from './record-payment-modal';
import { CustomerEditDialog, type CustomerEditableData } from './customer-edit-dialog';
import { generateFeedbackInviteAction } from '@/app/actions/feedback.actions';

const fmt = (n: number) => `Rs. ${Math.round(Number(n || 0)).toLocaleString()}`;

const fmtDate = (d: Date | string | null) =>
  d
    ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export type SerializableCustomer = CustomerEditableData & {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LedgerRow = {
  id: string;
  date: Date;
  type: 'CREDIT_SALE' | 'PAYMENT' | 'SALE_CANCELLED';
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  referenceId?: string | null;
};

export type SaleRow = {
  id: string;
  invoiceNumber: string;
  saleDate: Date;
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  total: number;
  paidAmount: number;
  itemCount: number;
};

export type PaymentRow = {
  id: string;
  date: Date;
  amount: number;
  method: string;
  notes: string | null;
};

export type FeedbackRow = {
  id: string;
  rating: number;
  category: string;
  status: string;
  message: string;
  resolutionNote: string | null;
  createdAt: Date;
};

export type AuditRow = {
  id: string;
  action: string;
  metadata: string | null;
  createdAt: Date;
};

export type TopProductRow = {
  productId: string;
  name: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
  totalSpend: number;
};

export type InsightsView = {
  totalPurchases: number;
  totalSpent: number;
  averageOrderValue: number;
  purchaseFrequencyDays: number | null;
  daysActive: number;
  topProducts: TopProductRow[];
  feedbackCount: number;
  averageRating: number | null;
};

export type CustomerViewData = {
  customer: SerializableCustomer;
  summary: {
    totalSalesCount: number;
    totalSpend: number;
    totalPaid: number;
    outstanding: number;
    lastPurchaseDate: Date | null;
  };
  sales: SaleRow[];
  payments: PaymentRow[];
  ledger: LedgerRow[];
  feedbacks: FeedbackRow[];
};

const STATUS_BADGE: Record<CustomerEditableData['status'], { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'warning' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

const LEDGER_TYPE: Record<LedgerRow['type'], { label: string; tone: BadgeTone }> = {
  CREDIT_SALE: { label: 'Udhaar / Credit Sale', tone: 'warning' },
  PAYMENT: { label: 'Payment Received', tone: 'success' },
  SALE_CANCELLED: { label: 'Sale Reversal', tone: 'neutral' },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  MOBILE_WALLET: 'Mobile Wallet',
  CREDIT: 'Credit',
};

const SALE_STATUS: Record<SaleRow['status'], { label: string; tone: BadgeTone }> = {
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  REFUNDED: { label: 'Refunded', tone: 'danger' },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

type TabKey = 'purchases' | 'payments' | 'insights' | 'feedback' | 'activity';

export function CustomerProfileView({
  businessId,
  data,
  insights,
  auditLogs,
  canManage,
  canPay,
}: {
  businessId: string;
  data: CustomerViewData;
  insights: InsightsView;
  auditLogs: AuditRow[];
  canManage: boolean;
  canPay: boolean;
}) {
  const { customer, summary, sales, payments, ledger, feedbacks } = data;
  const [activeTab, setActiveTab] = useState<TabKey>('purchases');
  const [editOpen, setEditOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const status = STATUS_BADGE[customer.status] ?? STATUS_BADGE.ACTIVE;
  const outstanding = Number(summary.outstanding || 0);
  const totalPaid = Number(summary.totalPaid || 0);
  const totalSpend = Number(summary.totalSpend || 0);

  const hasCreditHistory = ledger.some((entry) => entry.type !== 'PAYMENT');
  const udhaarState =
    outstanding > 0
      ? { label: 'Outstanding', tone: 'warning' as BadgeTone }
      : hasCreditHistory
        ? { label: 'Settled', tone: 'info' as BadgeTone }
        : { label: 'Clear', tone: 'success' as BadgeTone };

  async function handleGenerateFeedbackInvite() {
    setGenerating(true);
    const res = await generateFeedbackInviteAction(businessId, { customerId: customer.id });
    if (res.success && res.data) {
      const invite = res.data as { token: string };
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteLink(`${origin}/feedback/${invite.token}`);
    }
    setGenerating(false);
  }

  function copyLink(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabs: { key: TabKey; label: string; icon: typeof Package }[] = [
    { key: 'purchases', label: `Purchases (${sales.length})`, icon: ShoppingCart },
    { key: 'payments', label: `Payments (${payments.length})`, icon: Banknote },
    { key: 'insights', label: 'Insights', icon: Package },
    { key: 'feedback', label: `Feedback (${feedbacks.length})`, icon: Star },
    { key: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Customer header */}
      <Card padded className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-primary-soft text-lg font-bold text-primary"
            aria-hidden="true"
          >
            {initials(customer.name) || 'C'}
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <Badge tone={status.tone}>{status.label}</Badge>
              <Badge tone={udhaarState.tone}>{udhaarState.label}</Badge>
            </div>
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="break-all">{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{customer.address}</span>
                </div>
              )}
              <div>Customer since {fmtDate(customer.createdAt)}</div>
            </dl>
            {customer.notes && <p className="max-w-xl text-sm text-gray-600">{customer.notes}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-card border border-border bg-gray-50 px-4 py-3 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Outstanding Udhaar
            </p>
            <p
              className={cn(
                'text-2xl font-bold leading-tight',
                outstanding > 0 ? 'text-warning' : 'text-success',
              )}
            >
              {fmt(outstanding)}
            </p>
            <p className="text-xs text-muted">
              {outstanding > 0 ? 'Payment pending' : 'All clear'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            )}
            {canPay && (
              <RecordPaymentModal
                businessId={businessId}
                customerId={customer.id}
                customerName={customer.name}
                currentOutstanding={outstanding}
              />
            )}
          </div>
        </div>
      </Card>

      {editOpen && (
        <CustomerEditDialog
          businessId={businessId}
          customer={customer}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Financial summary */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Sales</p>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmt(totalSpend)}</p>
              <p className="mt-1 text-xs text-muted">
                across {summary.totalSalesCount} completed {summary.totalSalesCount === 1 ? 'sale' : 'sales'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Paid</p>
            <div>
              <p className="text-2xl font-bold leading-tight text-success">{fmt(totalPaid)}</p>
              <p className="mt-1 text-xs text-muted">advance + payments received</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Outstanding Udhaar</p>
            <div>
              <p
                className={cn(
                  'text-2xl font-bold leading-tight',
                  outstanding > 0 ? 'text-warning' : 'text-gray-900',
                )}
              >
                {fmt(outstanding)}
              </p>
              <p className="mt-1 text-xs text-muted">
                <Badge tone={udhaarState.tone}>{udhaarState.label}</Badge>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Payments Received</p>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{payments.length}</p>
              <p className="mt-1 text-xs text-muted">
                last {payments[0] ? fmtDate(payments[0].date) : 'none'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Udhaar ledger — always visible, the primary section */}
      <Card>
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Udhaar Ledger (Khata)</h2>
            <p className="text-sm text-muted">
              Credit sales add to the balance, payments reduce it. Running balance shown for each entry.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Running Balance</p>
            <p
              className={cn(
                'text-xl font-bold leading-tight',
                outstanding > 0 ? 'text-warning' : 'text-success',
              )}
            >
              {fmt(outstanding)}
            </p>
          </div>
        </div>

        {ledger.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No udhaar or payments yet"
            description="Credit sales and received payments will appear here as a running ledger."
            compact
          />
        ) : (
          <>
            {/* Desktop / tablet ledger table */}
            <TableWrap className="hidden md:block">
              <Table className="min-w-[680px]">
                <TableHead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Transaction</Th>
                    <Th>Type</Th>
                    <Th className="text-right text-warning">Debit (Udhaar)</Th>
                    <Th className="text-right text-success">Credit (Paid)</Th>
                    <Th className="text-right">Balance</Th>
                  </tr>
                </TableHead>
                <tbody>
                  {ledger.map((entry) => {
                    const type = LEDGER_TYPE[entry.type];
                    const linksToSale = Boolean(entry.referenceId) && entry.type !== 'PAYMENT';
                    return (
                      <Tr key={entry.id}>
                        <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(entry.date)}</Td>
                        <Td className="max-w-[300px]">
                          {linksToSale ? (
                            <Link
                              href={`/dashboard/sales/${entry.referenceId}`}
                              className="flex items-center gap-1 font-medium text-gray-800 hover:text-primary"
                            >
                              <span className="truncate">{entry.description}</span>
                              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </Link>
                          ) : (
                            <span className="block truncate text-gray-800">{entry.description}</span>
                          )}
                        </Td>
                        <Td>
                          <Badge tone={type.tone}>{type.label}</Badge>
                        </Td>
                        <Td className="text-right font-medium text-warning">
                          {entry.debit > 0 ? fmt(entry.debit) : '—'}
                        </Td>
                        <Td className="text-right font-medium text-success">
                          {entry.credit > 0 ? fmt(entry.credit) : '—'}
                        </Td>
                        <Td
                          className={cn(
                            'text-right font-mono font-semibold',
                            entry.runningBalance > 0 ? 'text-warning' : 'text-success',
                          )}
                        >
                          {fmt(entry.runningBalance)}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            {/* Mobile ledger cards */}
            <ul className="divide-y divide-border md:hidden">
              {ledger.map((entry) => {
                const type = LEDGER_TYPE[entry.type];
                const linksToSale = Boolean(entry.referenceId) && entry.type !== 'PAYMENT';
                return (
                  <li key={entry.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Badge tone={type.tone}>{type.label}</Badge>
                      <span className="text-xs text-muted">{fmtDateTime(entry.date)}</span>
                    </div>
                    {linksToSale ? (
                      <Link
                        href={`/dashboard/sales/${entry.referenceId}`}
                        className="flex items-center gap-1 text-sm font-medium text-gray-800"
                      >
                        <span className="break-words">{entry.description}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </Link>
                    ) : (
                      <p className="break-words text-sm text-gray-800">{entry.description}</p>
                    )}
                    <div className="flex items-center justify-between gap-3 rounded-input bg-gray-50 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-sm">
                        {entry.debit > 0 ? (
                          <>
                            <ArrowDownLeft className="h-4 w-4 text-warning" aria-hidden="true" />
                            <span className="font-semibold text-warning">+ {fmt(entry.debit)}</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="h-4 w-4 text-success" aria-hidden="true" />
                            <span className="font-semibold text-success">− {fmt(entry.credit)}</span>
                          </>
                        )}
                      </span>
                      <span className="text-right">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Balance
                        </span>
                        <span
                          className={cn(
                            'font-mono text-sm font-semibold',
                            entry.runningBalance > 0 ? 'text-warning' : 'text-success',
                          )}
                        >
                          {fmt(entry.runningBalance)}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Secondary tabs */}
      <Card>
        <nav aria-label="Customer sections" className="overflow-x-auto border-b border-border px-2">
          <ul className="inline-flex min-w-full items-center gap-1 sm:min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <li key={tab.key} className="flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex h-11 w-full items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors',
                      active
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-900',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Purchases */}
        {activeTab === 'purchases' &&
          (sales.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No purchases yet"
              description="Sales created for this customer will show up here."
              compact
            />
          ) : (
            <>
              <TableWrap className="hidden md:block">
                <Table className="min-w-[720px]">
                  <TableHead>
                    <tr>
                      <Th>Invoice</Th>
                      <Th>Date</Th>
                      <Th>Items</Th>
                      <Th className="text-right">Total</Th>
                      <Th className="text-right">Paid</Th>
                      <Th className="text-right">Due</Th>
                      <Th>Status</Th>
                    </tr>
                  </TableHead>
                  <tbody>
                    {sales.map((sale) => {
                      const saleTotal = Number(sale.total || 0);
                      const salePaid = Number(sale.paidAmount || 0);
                      const saleDue = Math.max(0, saleTotal - salePaid);
                      return (
                        <Tr key={sale.id}>
                          <Td>
                            <Link
                              href={`/dashboard/sales/${sale.id}`}
                              className="font-mono font-medium text-primary hover:text-primary-hover"
                            >
                              {sale.invoiceNumber}
                            </Link>
                          </Td>
                          <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(sale.saleDate)}</Td>
                          <Td className="text-xs text-gray-700">
                            {sale.itemCount} {sale.itemCount === 1 ? 'item' : 'items'}
                          </Td>
                          <Td className="text-right font-semibold text-gray-900">{fmt(saleTotal)}</Td>
                          <Td className="text-right font-medium text-success">{fmt(salePaid)}</Td>
                          <Td className="text-right font-semibold text-warning">
                            {saleDue > 0 ? fmt(saleDue) : '—'}
                          </Td>
                          <Td>
                            <Badge tone={SALE_STATUS[sale.status].tone}>
                              {SALE_STATUS[sale.status].label}
                            </Badge>
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrap>

              <ul className="divide-y divide-border md:hidden">
                {sales.map((sale) => {
                  const saleTotal = Number(sale.total || 0);
                  const salePaid = Number(sale.paidAmount || 0);
                  const saleDue = Math.max(0, saleTotal - salePaid);
                  return (
                    <li key={sale.id} className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="font-mono text-sm font-medium text-primary"
                        >
                          {sale.invoiceNumber}
                        </Link>
                        <Badge tone={SALE_STATUS[sale.status].tone}>
                          {SALE_STATUS[sale.status].label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">
                        {fmtDate(sale.saleDate)} · {sale.itemCount} {sale.itemCount === 1 ? 'item' : 'items'}
                      </p>
                      <div className="flex items-center justify-between gap-3 rounded-input bg-gray-50 px-3 py-2 text-sm">
                        <span>
                          Total <span className="font-semibold text-gray-900">{fmt(saleTotal)}</span>
                        </span>
                        <span className={cn('font-semibold', saleDue > 0 ? 'text-warning' : 'text-success')}>
                          {saleDue > 0 ? `Due ${fmt(saleDue)}` : 'Paid in full'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ))}

        {/* Payments */}
        {activeTab === 'payments' &&
          (payments.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No payments recorded"
              description={
                canPay
                  ? 'Record a payment from this customer to reduce their outstanding udhaar.'
                  : 'Payments recorded for this customer will appear here.'
              }
              action={
                canPay ? (
                  <RecordPaymentModal
                    businessId={businessId}
                    customerId={customer.id}
                    customerName={customer.name}
                    currentOutstanding={outstanding}
                  />
                ) : undefined
              }
              compact
            />
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {fmtDateTime(payment.date)}
                      {payment.notes ? ` · ${payment.notes}` : ''}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 font-semibold text-success">
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    {fmt(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ))}

        {/* Insights */}
        {activeTab === 'insights' && (
          <div className="space-y-6 p-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-card border border-border bg-gray-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Avg Order Value</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">{fmt(insights.averageOrderValue)}</dd>
              </div>
              <div className="rounded-card border border-border bg-gray-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Purchase Frequency</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">
                  {insights.purchaseFrequencyDays != null
                    ? `Every ${insights.purchaseFrequencyDays}d`
                    : '—'}
                </dd>
              </div>
              <div className="rounded-card border border-border bg-gray-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Days Active</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">{insights.daysActive}</dd>
              </div>
              <div className="rounded-card border border-border bg-gray-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Customer Rating</dt>
                <dd className="mt-1 flex items-center gap-1 text-lg font-bold text-gray-900">
                  {insights.averageRating != null ? insights.averageRating.toFixed(1) : '—'}
                  {insights.averageRating != null && (
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  )}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-sm font-bold text-gray-900">Top Purchased Products</h3>
              {insights.topProducts.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No completed purchase history yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border rounded-card border border-border">
                  {insights.topProducts.map((prod, idx) => (
                    <li key={prod.productId} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {idx + 1}. {prod.name}
                        </p>
                        <p className="text-xs text-muted">
                          in {prod.orderCount} {prod.orderCount === 1 ? 'sale' : 'sales'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {prod.totalQuantity} {prod.unit}
                        </p>
                        <p className="text-xs text-success">{fmt(prod.totalSpend)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Feedback */}
        {activeTab === 'feedback' && (
          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-3 rounded-card border border-border bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                Generate a secure feedback link to collect ratings from this customer.
              </p>
              {inviteLink ? (
                <button
                  type="button"
                  onClick={() => copyLink(inviteLink)}
                  className={buttonClasses('outline', 'sm', 'shrink-0')}
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
              ) : (
                <Button size="sm" onClick={handleGenerateFeedbackInvite} loading={generating}>
                  {!generating && <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                  Generate Feedback Link
                </Button>
              )}
            </div>

            {inviteLink && (
              <p className="break-all rounded-input border border-border bg-white p-3 font-mono text-xs text-gray-700">
                {inviteLink}
              </p>
            )}

            {feedbacks.length === 0 ? (
              <EmptyState
                icon={Star}
                title="No feedback yet"
                description="Feedback submitted by this customer will appear here."
                compact
              />
            ) : (
              <ul className="space-y-3">
                {feedbacks.map((f) => (
                  <li key={f.id} className="space-y-2 rounded-card border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="warning" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          {f.rating}.0
                        </Badge>
                        <span className="text-sm font-semibold text-gray-900">{f.category}</span>
                      </div>
                      <Badge
                        tone={
                          f.status === 'RESOLVED' ? 'success' : f.status === 'REVIEWING' ? 'warning' : 'info'
                        }
                      >
                        {f.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">“{f.message}”</p>
                    {f.resolutionNote && (
                      <Alert tone="success" title="Resolution">
                        {f.resolutionNote}
                      </Alert>
                    )}
                    <p className="text-xs text-muted">Submitted {fmtDate(f.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Activity */}
        {activeTab === 'activity' &&
          (auditLogs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity recorded"
              description="Audit events for this customer will appear here."
              compact
            />
          ) : (
            <ul className="divide-y divide-border">
              {auditLogs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-900">{log.action}</p>
                    {log.metadata && <p className="break-words text-xs text-muted">{log.metadata}</p>}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted">{fmtDateTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          ))}
      </Card>
    </div>
  );
}
