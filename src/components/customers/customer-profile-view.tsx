'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  User, 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  FileText, 
  CreditCard, 
  Star, 
  Package, 
  TrendingUp, 
  Activity, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Share2,
  Copy,
  Plus
} from 'lucide-react';
import { RecordPaymentModal } from './record-payment-modal';
import { generateFeedbackInviteAction } from '@/app/actions/feedback.actions';

export function CustomerProfileView({
  businessId,
  customerData,
  insights,
  auditLogs,
  isOwnerOrManager,
}: {
  businessId: string;
  customerData: any;
  insights: any;
  auditLogs: any[];
  isOwnerOrManager: boolean;
}) {
  const { customer, summary, ledger, sales } = customerData;
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'ledger' | 'feedback' | 'activity'>('overview');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateFeedbackInvite = async () => {
    setGenerating(true);
    const res = await generateFeedbackInviteAction(businessId, { customerId: customer.id });
    if (res.success && res.data) {
      const invite = res.data as { token: string };
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteLink(`${origin}/feedback/${invite.token}`);
    }
    setGenerating(false);
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview & Insights', icon: User },
    { id: 'purchases', label: `Purchases (${sales.length})`, icon: ShoppingCart },
    { id: 'ledger', label: 'Khata Ledger', icon: FileText },
    { id: 'feedback', label: `Feedback (${customer.feedbacks?.length || 0})`, icon: Star },
    { id: 'activity', label: 'Activity & Audit', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Customer Header Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 bg-blue-100 text-blue-700 font-black text-xl rounded-2xl flex items-center justify-center shrink-0">
            {customer.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  customer.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : customer.status === 'INACTIVE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {customer.status || 'ACTIVE'}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-0.5">
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> {customer.email}
                </span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> {customer.address}
                </span>
              )}
              <span>• Customer since {new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Outstanding & Quick Action */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-left md:text-right min-w-[170px]">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Outstanding Khata
            </span>
            <h2 className={`text-2xl font-bold mt-1 ${summary.outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              Rs. {summary.outstanding.toLocaleString()}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {summary.outstanding > 0 ? 'Payment pending' : 'All accounts cleared'}
            </p>
          </div>

          <RecordPaymentModal
            businessId={businessId}
            customerId={customer.id}
            customerName={customer.name}
            currentOutstanding={summary.outstanding}
          />
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Factual Insights */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Insights KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase">Lifetime Spend</span>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                Rs. {insights.totalSpent.toLocaleString()}
              </h3>
              <span className="text-[11px] text-gray-400">{insights.totalPurchases} completed purchases</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-blue-700 uppercase">Average Order Value (AOV)</span>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">
                Rs. {insights.averageOrderValue.toLocaleString()}
              </h3>
              <span className="text-[11px] text-blue-500">Per purchase average</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-purple-700 uppercase">Purchase Frequency</span>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">
                {insights.purchaseFrequencyDays ? `Every ${insights.purchaseFrequencyDays} days` : '—'}
              </h3>
              <span className="text-[11px] text-purple-500">
                {insights.daysActive > 0 ? `${insights.daysActive} days active history` : 'New customer'}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-amber-700 uppercase">Customer Rating</span>
              <div className="flex items-center gap-1.5 mt-1">
                <h3 className="text-2xl font-bold text-amber-800">
                  {insights.averageRating ? `${insights.averageRating}` : '—'}
                </h3>
                {insights.averageRating && <Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
              </div>
              <span className="text-[11px] text-amber-600">{insights.feedbackCount} reviews given</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Purchased Products */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm border-b pb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> Favorite / Top Purchased Products
              </h3>

              {insights.topProducts.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">No completed purchase history yet.</div>
              ) : (
                <div className="divide-y divide-gray-100 space-y-2">
                  {insights.topProducts.map((prod: any, idx: number) => (
                    <div key={prod.productId} className="pt-2 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-900">
                          {idx + 1}. {prod.name}
                        </span>
                        <span className="text-[11px] text-gray-400 block">
                          Ordered in {prod.orderCount} {prod.orderCount === 1 ? 'sale' : 'sales'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 block">
                          {prod.totalQuantity} {prod.unit}
                        </span>
                        <span className="text-[11px] text-green-700 font-medium">
                          Rs. {prod.totalSpend.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Engagement & Feedback Quick Action */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 text-sm border-b pb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Customer Engagement & Loyalty
                </h3>

                <p className="text-xs text-gray-600 leading-relaxed">
                  Send a personalized, secure feedback link to this customer to collect direct ratings on product quality, pricing, and service.
                </p>

                {inviteLink ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-blue-900 block">Secure Feedback Link:</span>
                    <p className="text-xs font-mono text-blue-800 break-all">{inviteLink}</p>
                    <button
                      onClick={() => copyLink(inviteLink)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied to Clipboard!' : 'Copy Link'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateFeedbackInvite}
                    disabled={generating}
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> {generating ? 'Generating Link...' : 'Generate Customer Feedback Link'}
                  </button>
                )}
              </div>

              {customer.notes && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 mt-2">
                  <span className="font-bold text-gray-800 block mb-1">Customer Profile Notes:</span>
                  {customer.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Purchases */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Purchase Invoices History</h3>
            <p className="text-xs text-gray-500 mt-0.5">All sales invoices generated for this customer.</p>
          </div>

          {sales.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No sales invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                    <th className="px-6 py-3.5 font-medium">Invoice #</th>
                    <th className="px-6 py-3.5 font-medium">Date</th>
                    <th className="px-6 py-3.5 font-medium">Items</th>
                    <th className="px-6 py-3.5 font-medium text-right">Grand Total</th>
                    <th className="px-6 py-3.5 font-medium text-right">Paid</th>
                    <th className="px-6 py-3.5 font-medium text-right">Due Balance</th>
                    <th className="px-6 py-3.5 font-medium text-center">Status</th>
                    <th className="px-6 py-3.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map((sale: any) => {
                    const saleTotal = Number(sale.total);
                    const salePaid = Number(sale.paidAmount);
                    const saleDue = Math.max(0, saleTotal - salePaid);

                    return (
                      <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-medium text-blue-600">
                          <Link href={`/dashboard/sales/${sale.id}`} className="hover:underline">
                            {sale.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 text-xs">
                          {new Date(sale.saleDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-700">
                          {sale.items.length} items
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold text-gray-900">
                          Rs. {saleTotal.toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium text-green-600">
                          Rs. {salePaid.toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-orange-600">
                          {saleDue > 0 ? `Rs. ${saleDue.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-3.5 text-center text-xs font-semibold">
                          {sale.status === 'COMPLETED' ? (
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Completed</span>
                          ) : (
                            <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Cancelled</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right text-xs">
                          <Link href={`/dashboard/sales/${sale.id}`} className="text-blue-600 hover:underline font-medium">
                            View Invoice &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Unified Customer Credit Ledger (Khata)</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Complete audit trail of credit purchases, payments received, and running balance.
              </p>
            </div>
          </div>

          {ledger.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No credit transactions or payments recorded for this customer yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                    <th className="px-6 py-3.5 font-medium">Date</th>
                    <th className="px-6 py-3.5 font-medium">Transaction Type</th>
                    <th className="px-6 py-3.5 font-medium">Description</th>
                    <th className="px-6 py-3.5 font-medium text-right text-orange-600">+ Debit (Debt)</th>
                    <th className="px-6 py-3.5 font-medium text-right text-green-600">- Credit (Paid)</th>
                    <th className="px-6 py-3.5 font-medium text-right font-bold text-gray-900">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledger.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-gray-500 text-xs">
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-3.5">
                        {entry.type === 'CREDIT_SALE' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-700">
                            Credit Sale
                          </span>
                        )}
                        {entry.type === 'PAYMENT' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700">
                            Payment Received
                          </span>
                        )}
                        {entry.type === 'SALE_CANCELLED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                            Sale Reversal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-700">
                        {entry.referenceId && entry.type.startsWith('CREDIT_SALE') ? (
                          <Link 
                            href={`/dashboard/sales/${entry.referenceId}`}
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            {entry.description}
                          </Link>
                        ) : (
                          <span>{entry.description}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-orange-600">
                        {entry.debit > 0 ? `Rs. ${entry.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-green-600">
                        {entry.credit > 0 ? `Rs. ${entry.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-gray-900 font-mono">
                        Rs. {entry.runningBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Feedback */}
      {activeTab === 'feedback' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm">Customer Feedback & Reviews</h3>
            <button
              onClick={handleGenerateFeedbackInvite}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Request Review
            </button>
          </div>

          {customer.feedbacks?.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No feedback submitted by this customer yet.</div>
          ) : (
            <div className="divide-y divide-gray-100 space-y-3">
              {customer.feedbacks.map((f: any) => (
                <div key={f.id} className="pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-amber-900">{f.rating}.0</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{f.category}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.status === 'RESOLVED'
                          ? 'bg-green-100 text-green-800'
                          : f.status === 'REVIEWING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed italic">
                    "{f.message}"
                  </p>

                  {f.resolutionNote && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950">
                      <span className="font-bold block">Resolution:</span>
                      {f.resolutionNote}
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 block pt-1">
                    Submitted on {new Date(f.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Activity & Audit Trail */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b pb-3">Audit Trail History</h3>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No audit events recorded for this customer.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-gray-900">{log.action}</span>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      {log.metadata ? JSON.stringify(JSON.parse(log.metadata)) : '—'}
                    </p>
                  </div>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
