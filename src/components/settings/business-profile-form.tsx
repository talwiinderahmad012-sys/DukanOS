'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Store, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Globe,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { updateBusinessProfileAction } from '@/app/actions/settings.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function BusinessProfileForm({
  businessId,
  initialBusiness,
  initialSettings,
}: {
  businessId: string;
  initialBusiness: any;
  initialSettings: any;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, tm } = useTranslation();

  const [form, setForm] = useState({
    name: initialBusiness.name || '',
    phone: initialBusiness.phone || '',
    email: initialBusiness.email || '',
    address: initialBusiness.address || '',
    city: initialBusiness.city || '',
    country: initialBusiness.country || 'Pakistan',
    timezone: initialBusiness.timezone || 'Asia/Karachi',
    currency: initialBusiness.currency || 'PKR',
    currencySymbol: initialSettings.currencySymbol || 'Rs.',
    currencyPosition: initialSettings.currencyPosition || 'BEFORE',
    operatingHours: initialBusiness.operatingHours || '',
    district: initialBusiness.district || '',
    province: initialBusiness.province || '',
    website: initialBusiness.website || '',
    description: initialBusiness.description || '',
    type: initialBusiness.type || 'RETAIL',
    logoUrl: initialBusiness.logoUrl || '',
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg(null);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', businessId);

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setForm({ ...form, logoUrl: data.url });
      setSuccessMsg(t('settings.logoUploadedSaveToApply'));
    } catch (error: any) {
      setErrorMsg(tm(error.message) || t('settings.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg(t('settings.businessNameRequired'));
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateBusinessProfileAction(businessId, form);

    if (res.success) {
      setSuccessMsg(t('settings.businessSaved'));
      router.refresh();
    } else {
      setErrorMsg(res.message ? tm(res.message) : t('settings.businessProfileSaveFailed'));
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
          <span>{t('settings.backToSettings')}</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.businessProfilePageTitle')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('settings.businessProfilePageSubtitle')}
        </p>
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

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
        
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            {t('settings.storeIdentitySection')}
          </h2>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt={t('settings.logoLabel')} className="w-full h-full object-contain" />
              ) : (
                <Store className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                <span>{uploading ? t('common.uploading') : t('settings.uploadLogo')}</span>
              </button>
              <p className="text-[10px] text-gray-500 mt-1">{t('settings.logoFileHint')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="field-name" className="text-xs font-semibold text-gray-700 block">{t('settings.businessNameLabel')} *</label>
              <input
                id="field-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label htmlFor="field-type" className="text-xs font-semibold text-gray-700 block">{t('settings.businessType')}</label>
              <select
                id="field-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="RETAIL">{t('settings.businessTypeRetail')}</option>
                <option value="WHOLESALE">{t('settings.businessTypeWholesale')}</option>
                <option value="SERVICES">{t('settings.businessTypeServices')}</option>
                <option value="OTHER">{t('common.other')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            {t('settings.contactSection')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="field-phone" className="text-xs font-semibold text-gray-700 block">{t('common.phoneNumber')}</label>
              <input
                id="field-phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+92 300 1234567"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="field-email" className="text-xs font-semibold text-gray-700 block">{t('common.emailAddress')}</label>
              <input
                id="field-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="store@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label htmlFor="field-website" className="text-xs font-semibold text-gray-700 block">{t('settings.websiteLabel')}</label>
              <input
                id="field-website"
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="field-hours" className="text-xs font-semibold text-gray-700 block">{t('settings.operatingHours')}</label>
              <input
                id="field-hours"
                type="text"
                value={form.operatingHours}
                onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
                placeholder={t('settings.operatingHoursPlaceholder')}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            {t('settings.locationSection')}
          </h2>
          <div className="space-y-1">
            <label htmlFor="field-address" className="text-xs font-semibold text-gray-700 block">{t('settings.streetAddress')}</label>
            <input
              id="field-address"
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={t('settings.streetAddressPlaceholder')}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="field-city" className="text-xs font-semibold text-gray-700 block">{t('common.city')}</label>
              <input
                id="field-city"
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder={t('settings.cityPlaceholder')}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label htmlFor="field-district" className="text-xs font-semibold text-gray-700 block">{t('settings.districtLabel')}</label>
              <input
                id="field-district"
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label htmlFor="field-province" className="text-xs font-semibold text-gray-700 block">{t('settings.provinceLabel')}</label>
              <input
                id="field-province"
                type="text"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="field-country" className="text-xs font-semibold text-gray-700 block">{t('common.country')}</label>
              <input
                id="field-country"
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-gray-500" />
            <span>{t('settings.regionalSection')}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="field-timezone" className="text-xs font-semibold text-gray-700 block">{t('settings.timezoneLabel')}</label>
              <select
                id="field-timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="Asia/Karachi">{t('settings.timezoneKarachi')}</option>
                <option value="Asia/Dubai">{t('settings.timezoneDubai')}</option>
                <option value="Asia/Riyadh">{t('settings.timezoneRiyadh')}</option>
                <option value="Europe/London">{t('settings.timezoneLondon')}</option>
                <option value="America/New_York">{t('settings.timezoneNewYork')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="field-currencySymbol" className="text-xs font-semibold text-gray-700 block">{t('settings.currency')}</label>
              <input
                id="field-currencySymbol"
                type="text"
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                placeholder="Rs."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="field-currencyPosition" className="text-xs font-semibold text-gray-700 block">{t('settings.currencyPositionLabel')}</label>
              <select
                id="field-currencyPosition"
                value={form.currencyPosition}
                onChange={(e) => setForm({ ...form, currencyPosition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="BEFORE">{t('settings.currencyPositionBefore')}</option>
                <option value="AFTER">{t('settings.currencyPositionAfter')}</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            {t('settings.descriptionSection')}
          </h2>
          <div className="space-y-1">
            <label htmlFor="field-description" className="sr-only">{t('settings.businessDescriptionPlaceholder')}</label>
            <textarea
              id="field-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('settings.businessDescriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/settings"
            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
          >
            {t('common.cancel')}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? t('settings.savingChanges') : t('settings.saveProfile')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
