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
import { useTranslation } from '@/lib/i18n/language-context';
import { createBranchAction, updateBranchAction, deactivateBranchAction, reactivateBranchAction } from '@/app/actions/settings.actions';

const STATUS_KEYS: Record<string, string> = {
  ACTIVE: 'common.active',
  INACTIVE: 'common.inactive',
};

export function BranchesView({
  businessId,
  initialBranches,
}: {
  businessId: string;
  initialBranches: any[];
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
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

  const statusLabel = (status: string) => t(STATUS_KEYS[status] ?? 'common.unknown', status);

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
        setSuccessMsg(t('settingsAdmin.branches.updatedMsg', { name: form.name }));
        setShowModal(false);
        router.refresh();
      } else {
        setErrorMsg(tm(res.message) || t('settingsAdmin.branches.updateFailed'));
      }
    } else {
      const res = await createBranchAction(businessId, form);

      if (res.success) {
        setSuccessMsg(t('settingsAdmin.branches.createdMsg', { name: form.name }));
        setShowModal(false);
        router.refresh();
      } else {
        setErrorMsg(tm(res.message) || t('settingsAdmin.branches.createFailed'));
      }
    }
    setSaving(false);
  };

  const handleDeactivate = async (branch: any) => {
    if (activeBranchCount <= 1) {
      alert(t('settingsAdmin.branches.cannotDeactivateLast'));
      return;
    }
    if (!confirm(t('settingsAdmin.branches.deactivateConfirm', { name: branch.name }))) return;
    
    setSaving(true);
    const res = await deactivateBranchAction(businessId, branch.id);
    if (res.success) {
      setSuccessMsg(t('settingsAdmin.branches.deactivatedMsg'));
      router.refresh();
    } else {
      setErrorMsg(tm(res.message) || t('settingsAdmin.branches.deactivateFailed'));
    }
    setSaving(false);
  };

  const handleReactivate = async (branch: any) => {
    setSaving(true);
    const res = await reactivateBranchAction(businessId, branch.id);
    if (res.success) {
      setSuccessMsg(t('settingsAdmin.branches.reactivatedMsg'));
      router.refresh();
    } else {
      setErrorMsg(tm(res.message) || t('settingsAdmin.branches.reactivateFailed'));
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
            <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
            <span>{t('settingsAdmin.backToSettings')}</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('settingsAdmin.branches.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('settingsAdmin.branches.description')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{t('settingsAdmin.branches.newBranch')}</span>
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
          <span>{t('settingsAdmin.branches.minOneActive')}</span>
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
                  <div className={`w-8 h-8 rounded-xl ${b.status === 'ACTIVE' ? 'bg-primary-soft text-gray-900' : 'bg-gray-100 text-gray-500'} flex items-center justify-center font-bold text-xs`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    {b.name}
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                      {statusLabel(b.status)}
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
                  title={t('settingsAdmin.branches.deactivateTitle')}
                >
                  <PowerOff className="w-3 h-3" />
                  <span>{t('settingsAdmin.branches.deactivate')}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleReactivate(b)}
                  disabled={saving}
                  className="px-3 py-1.5 hover:bg-emerald-50 text-emerald-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Power className="w-3 h-3" />
                  <span>{t('settingsAdmin.branches.reactivate')}</span>
                </button>
              )}
              <button
                onClick={() => openEditModal(b)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Edit2 className="w-3 h-3 text-gray-500" />
                <span>{t('common.edit')}</span>
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
                {editingBranch ? t('settingsAdmin.branches.editBranch') : t('settingsAdmin.branches.addNewBranch')}
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
                  <label className="text-xs font-semibold text-gray-700 block">{t('settingsAdmin.branches.branchNameLabel')}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder={t('settingsAdmin.branches.namePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">{t('settingsAdmin.branches.branchCodeLabel')}</label>
                  <input
                    type="text"
                    value={form.code}
                    disabled={!!editingBranch}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    placeholder={t('settingsAdmin.branches.codePlaceholder')}
                    className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-primary focus:outline-none ${
                      editingBranch ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">{t('common.emailAddress')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t('settingsAdmin.branches.emailPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">{t('settingsAdmin.branches.streetAddress')}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t('settingsAdmin.branches.addressPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">{t('common.city')}</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder={t('settingsAdmin.branches.cityPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">{t('common.phone')}</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={t('settingsAdmin.branches.phonePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {saving ? t('common.saving') : editingBranch ? t('settingsAdmin.branches.updateBranch') : t('settingsAdmin.branches.createBranch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
