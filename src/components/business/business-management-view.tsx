'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Plus, 
  Store, 
  CheckCircle2, 
  ArrowRightLeft, 
  Archive, 
  RotateCcw, 
  Users, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  switchActiveBusinessAction, 
  createBusinessAction, 
  archiveBusinessAction, 
  transferOwnershipAction 
} from '@/app/actions/business.actions';

type BusinessItem = {
  membershipId: string;
  role: string;
  joinedAt: Date;
  business: {
    id: string;
    name: string;
    type: string;
    status: string;
    currency: string;
    currencySymbol: string;
    timezone: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    branchesCount: number;
    createdAt: Date;
  };
};

export function BusinessManagementView({
  businesses,
  activeBusinessId,
  currentUserId,
}: {
  businesses: BusinessItem[];
  activeBusinessId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState<string | null>(null);
  const [targetMemberEmail, setTargetMemberEmail] = useState('');
  const [transferRole, setTransferRole] = useState<'MANAGER' | 'CASHIER'>('MANAGER');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state for creating new business
  const [formData, setFormData] = useState({
    name: '',
    type: 'RETAIL',
    phone: '',
    address: '',
    city: '',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
  });

  const handleSwitch = async (businessId: string) => {
    setLoadingId(businessId);
    setErrorMsg(null);
    const res = await switchActiveBusinessAction(businessId);
    if (res.success) {
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to switch business.');
    }
    setLoadingId(null);
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoadingId('CREATE');
    setErrorMsg(null);
    const res = await createBusinessAction({
      name: formData.name,
      type: formData.type as any,
      phone: formData.phone || null,
      address: formData.address || null,
      city: formData.city || null,
      branchName: formData.branchName,
      branchCode: formData.branchCode,
    });

    if (res.success) {
      setShowCreateModal(false);
      setSuccessMsg('Business created successfully! Context switched to new store.');
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to create business.');
    }
    setLoadingId(null);
  };

  const handleArchiveToggle = async (businessId: string, currentStatus: string) => {
    const actionName = currentStatus === 'ARCHIVED' ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${actionName} this business?`)) {
      return;
    }

    setLoadingId(businessId);
    setErrorMsg(null);
    const res = await archiveBusinessAction(businessId);
    if (res.success) {
      setSuccessMsg(`Business successfully ${currentStatus === 'ARCHIVED' ? 'restored' : 'archived'}.`);
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to update business status.');
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" /> Multi-Tenant Store Cockpit
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            My Businesses & Organizations
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage multiple physical retail outlets, wholesale centers, and franchises from one centralized account.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Business
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Business Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((item) => {
          const biz = item.business;
          const isActive = biz.id === activeBusinessId;
          const isOwner = item.role === 'OWNER';
          const isArchived = biz.status === 'ARCHIVED';

          return (
            <div
              key={biz.id}
              className={`bg-white rounded-3xl border transition-all p-6 flex flex-col justify-between relative overflow-hidden ${
                isActive 
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
                  : 'border-gray-200/80 hover:border-gray-300 shadow-xs'
              }`}
            >
              {/* Active Badge */}
              {isActive && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                  Active Context
                </div>
              )}

              <div className="space-y-4">
                {/* Icon & Title */}
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    <Store className="w-6 h-6" />
                  </div>

                  <div className="overflow-hidden pr-12">
                    <h3 className="font-bold text-base text-gray-900 truncate">
                      {biz.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {biz.type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isOwner ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.role}
                      </span>
                      {isArchived && (
                        <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{biz.branchesCount} {biz.branchesCount === 1 ? 'Branch' : 'Branches'}</span>
                  </div>
                  {biz.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{biz.city}</span>
                    </div>
                  )}
                  {biz.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{biz.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-6 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                {!isActive ? (
                  <button
                    onClick={() => handleSwitch(biz.id)}
                    disabled={loadingId === biz.id}
                    className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
                  >
                    {loadingId === biz.id ? 'Switching...' : 'Switch To Store'}
                  </button>
                ) : (
                  <div className="flex-1 px-4 py-2 bg-blue-50 text-blue-800 rounded-xl text-xs font-bold text-center">
                    Current Active Store
                  </div>
                )}

                {isOwner && (
                  <button
                    onClick={() => handleArchiveToggle(biz.id, biz.status)}
                    title={isArchived ? 'Restore Business' : 'Archive Business'}
                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                  >
                    {isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Create New Business</h3>
                  <p className="text-xs text-gray-500">Add another store or branch under your account</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmad Wholesale & Distribution"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Business Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RETAIL">General Retail</option>
                    <option value="GROCERY">Grocery / Supermarket</option>
                    <option value="PHARMACY">Pharmacy / Medical</option>
                    <option value="ELECTRONICS">Electronics & Mobile</option>
                    <option value="CLOTHING">Clothing & Boutique</option>
                    <option value="WHOLESALE">Wholesale / Distribution</option>
                    <option value="RESTAURANT">Restaurant / Cafe</option>
                    <option value="OTHER">Other Business</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Multan, Layyah"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0300-1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Initial Branch Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MAIN, KOT"
                    value={formData.branchCode}
                    onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. Shop # 14, Main Market"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingId === 'CREATE'}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  {loadingId === 'CREATE' ? 'Creating...' : 'Create & Open Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
