'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Store,
  CheckCircle2,
  Archive,
  RotateCcw,
  MapPin,
  Phone,
  AlertCircle
} from 'lucide-react';
import {
  switchActiveBusinessAction,
  createBusinessAction,
  archiveBusinessAction,
  transferOwnershipAction
} from '@/app/actions/business.actions';
import { useTranslation } from '@/lib/i18n/language-context';

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
  const { t, tm } = useTranslation();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState<string | null>(null);
  const [targetMemberEmail, setTargetMemberEmail] = useState('');
  const [transferRole, setTransferRole] = useState<'MANAGER' | 'CASHIER'>('MANAGER');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const roleLabels: Record<string, string> = {
    OWNER: t('business.roleOwner'),
    MANAGER: t('business.roleManager'),
    CASHIER: t('business.roleCashier'),
    EMPLOYEE: t('business.roleEmployee'),
  };

  const typeLabels: Record<string, string> = {
    RETAIL: t('business.typeRETAIL'),
    GROCERY: t('business.typeGROCERY'),
    PHARMACY: t('business.typePHARMACY'),
    ELECTRONICS: t('business.typeELECTRONICS'),
    CLOTHING: t('business.typeCLOTHING'),
    WHOLESALE: t('business.typeWHOLESALE'),
    RESTAURANT: t('business.typeRESTAURANT'),
    OTHER: t('business.typeOTHER'),
  };

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
      setErrorMsg(res.message ? tm(res.message) : t('business.switchFailed'));
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
      setSuccessMsg(t('business.createSuccess'));
      router.refresh();
    } else {
      setErrorMsg(res.message ? tm(res.message) : t('business.createFailed'));
    }
    setLoadingId(null);
  };

  const handleArchiveToggle = async (businessId: string, currentStatus: string) => {
    const isArchived = currentStatus === 'ARCHIVED';
    if (!confirm(isArchived ? t('business.confirmRestore') : t('business.confirmArchive'))) {
      return;
    }

    setLoadingId(businessId);
    setErrorMsg(null);
    const res = await archiveBusinessAction(businessId);
    if (res.success) {
      setSuccessMsg(isArchived ? t('business.restoredSuccess') : t('business.archivedSuccess'));
      router.refresh();
    } else {
      setErrorMsg(res.message ? tm(res.message) : t('business.statusUpdateFailed'));
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" /> {t('business.cockpitLabel')}
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {t('business.pageTitle')}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {t('business.pageSubtitle')}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-2xl font-bold text-xs shadow-md shadow-primary/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {t('business.createBusiness')}
        </button>
      </div>

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
                  ? 'border-blue-500 ring-2 ring-primary/20 shadow-md'
                  : 'border-gray-200/80 hover:border-gray-300 shadow-xs'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 end-0 bg-primary text-on-primary text-[10px] font-black uppercase px-3 py-1 rounded-es-xl tracking-wider">
                  {t('business.activeContext')}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg ${
                    isActive ? 'bg-primary text-on-primary' : 'bg-gray-100 text-gray-700'
                  }`}>
                    <Store className="w-6 h-6" />
                  </div>

                  <div className="overflow-hidden pe-12">
                    <h3 className="font-bold text-base text-gray-900 truncate">
                      {biz.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {typeLabels[biz.type] ?? biz.type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isOwner ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-gray-900'
                      }`}>
                        {roleLabels[item.role] ?? item.role}
                      </span>
                      {isArchived && (
                        <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {t('business.archived')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>
                      {biz.branchesCount === 1
                        ? t('business.branchCountOne', { count: biz.branchesCount })
                        : t('business.branchCountMany', { count: biz.branchesCount })}
                    </span>
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

              <div className="pt-6 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                {!isActive ? (
                  <button
                    onClick={() => handleSwitch(biz.id)}
                    disabled={loadingId === biz.id}
                    className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
                  >
                    {loadingId === biz.id ? t('business.switching') : t('business.switchToStore')}
                  </button>
                ) : (
                  <div className="flex-1 px-4 py-2 bg-primary-soft text-gray-900 rounded-xl text-xs font-bold text-center">
                    {t('business.currentActiveStore')}
                  </div>
                )}

                {isOwner && (
                  <button
                    onClick={() => handleArchiveToggle(biz.id, biz.status)}
                    title={isArchived ? t('business.restoreBusinessTitle') : t('business.archiveBusinessTitle')}
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-gray-900">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">{t('business.modalTitle')}</h3>
                  <p className="text-xs text-gray-500">{t('business.modalSubtitle')}</p>
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
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('business.nameLabel')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('business.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">{t('business.typeLabel')}</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">{t('common.city')}</label>
                  <input
                    type="text"
                    placeholder={t('business.cityPlaceholder')}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">{t('common.phoneNumber')}</label>
                  <input
                    type="tel"
                    placeholder={t('business.phonePlaceholder')}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">{t('business.branchCodeLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('business.branchCodePlaceholder')}
                    value={formData.branchCode}
                    onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('business.addressLabel')}</label>
                <input
                  type="text"
                  placeholder={t('business.addressPlaceholder')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loadingId === 'CREATE'}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-md shadow-primary/20"
                >
                  {loadingId === 'CREATE' ? t('common.creating') : t('business.createAndOpen')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
