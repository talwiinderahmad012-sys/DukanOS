'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Phone,
  Edit2,
  Mail,
  PowerOff,
  Power
} from 'lucide-react';
import { createBranchAction, updateBranchAction, deactivateBranchAction, reactivateBranchAction } from '@/app/actions/settings.actions';

export function BranchesView({
  businessId,
  initialBranches,
}: {
  businessId: string;
  initialBranches: any[];
}) {
  const router = useRouter();
  const [branches, setBranches] = useState<any[]>(initialBranches);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    city: '',
    email: '',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeBranchCount = branches.filter(b => b.status === 'ACTIVE').length;

  const openCreateModal = () => {
    setEditingBranch(null);
    setForm({ name: '', code: '', address: '', phone: '', city: '', email: '' });
    setShowModal(true);
  };

  const openEditModal = (branch: any) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
      city: branch.city || '',
      email: branch.email || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (editingBranch) {
      const res = await updateBranchAction(businessId, {
        branchId: editingBranch.id,
        ...form
      });

      if (res.success) {
        setSuccessMsg(`Branch "${form.name}" updated successfully.`);
        setShowModal(false);
        router.refresh();
      } else {
        setErrorMsg(res.message || 'Failed to update branch.');
      }
    } else {
      const res = await createBranchAction(businessId, form);

      if (res.success) {
        setSuccessMsg(`Branch "${form.name}" created successfully.`);
        setShowModal(false);
        router.refresh();
      } else {
        setErrorMsg(res.message || 'Failed to create branch.');
      }
    }
    setSaving(false);
  };

  const handleDeactivate = async (branch: any) => {
    if (activeBranchCount <= 1) {
      alert('Cannot deactivate the last active branch.');
      return;
    }
    if (!confirm(`Are you sure you want to deactivate ${branch.name}?`)) return;
    
    setSaving(true);
    const res = await deactivateBranchAction(businessId, branch.id);
    if (res.success) {
      setSuccessMsg(`Branch deactivated.`);
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to deactivate branch.');
    }
    setSaving(false);
  };

  const handleReactivate = async (branch: any) => {
    setSaving(true);
    const res = await reactivateBranchAction(businessId, branch.id);
    if (res.success) {
      setSuccessMsg(`Branch reactivated.`);
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to reactivate branch.');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/dashboard/settings"
            className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Branch Locations</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage physical outlets, store codes, phone numbers, and addresses.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Branch</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeBranchCount <= 1 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>You must have at least 1 active branch.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {branches.map((b) => (
          <div
            key={b.id}
            className={`bg-white rounded-3xl border ${b.status === 'ACTIVE' ? 'border-gray-200 hover:border-gray-300' : 'border-red-100 opacity-75'} p-5 shadow-xs flex flex-col justify-between space-y-4 transition-colors`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl ${b.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'} flex items-center justify-center font-bold text-xs`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    {b.name}
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                      {b.status}
                    </span>
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-mono font-bold">
                  {b.code}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-500 pt-1">
                {b.address && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{b.address}{b.city ? `, ${b.city}` : ''}</span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-1.5 text-gray-600 font-mono text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                )}
                {b.email && (
                  <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{b.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              {b.status === 'ACTIVE' ? (
                <button
                  onClick={() => handleDeactivate(b)}
                  disabled={saving || activeBranchCount <= 1}
                  className="px-3 py-1.5 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Deactivate branch"
                >
                  <PowerOff className="w-3 h-3" />
                  <span>Deactivate</span>
                </button>
              ) : (
                <button
                  onClick={() => handleReactivate(b)}
                  disabled={saving}
                  className="px-3 py-1.5 hover:bg-emerald-50 text-emerald-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Power className="w-3 h-3" />
                  <span>Reactivate</span>
                </button>
              )}
              <button
                onClick={() => openEditModal(b)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Edit2 className="w-3 h-3 text-gray-500" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">Branch Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g. Main Market"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">Branch Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    disabled={!!editingBranch}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    placeholder="e.g. BR-01"
                    className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      editingBranch ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="branch@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">Street Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Plot 12, Commercial Area"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Lahore"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+92 300 0000000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
