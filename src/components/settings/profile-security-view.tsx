'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Lock, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { 
  updateUserProfileAction, 
  changePasswordAction 
} from '@/app/actions/settings.actions';

export function ProfileSecurityView({
  initialUser,
  initialTab = 'PROFILE',
}: {
  initialUser: { id: string; name?: string | null; email?: string | null; phone?: string | null };
  initialTab?: 'PROFILE' | 'SECURITY';
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY'>(initialTab);

  // Profile state
  const [profileName, setProfileName] = useState(initialUser.name || '');
  const [profilePhone, setProfilePhone] = useState(initialUser.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Feedback messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateUserProfileAction({
      name: profileName,
      phone: profilePhone,
    });

    if (res.success) {
      setSuccessMsg(t('settingsAdmin.profile.profileUpdated'));
      router.refresh();
    } else {
      setErrorMsg(tm(res.message) || t('settingsAdmin.profile.profileUpdateFailed'));
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg(t('settingsAdmin.profile.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t('settingsAdmin.profile.passwordMismatch'));
      return;
    }

    setSavingPassword(true);
    const res = await changePasswordAction({
      currentPassword,
      newPassword,
    });

    if (res.success) {
      setSuccessMsg(t('settings.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setErrorMsg(tm(res.message) || t('settingsAdmin.profile.passwordChangeFailed'));
    }
    setSavingPassword(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
          <span>{t('settingsAdmin.backToSettings')}</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('settingsAdmin.profile.title')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('settingsAdmin.profile.description')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => {
            setActiveTab('PROFILE');
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'PROFILE'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t('settingsAdmin.profile.tabProfile')}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('SECURITY');
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'SECURITY'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>{t('settingsAdmin.profile.tabSecurity')}</span>
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

      {/* TAB 1: Profile */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">{t('common.fullName')}</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">{t('settingsAdmin.profile.emailReadOnly')}</label>
            <input
              type="email"
              value={initialUser.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">{t('common.phoneNumber')}</label>
            <input
              type="text"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="+92 300 1234567"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? t('common.saving') : t('settingsAdmin.profile.saveProfile')}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Security */}
      {activeTab === 'SECURITY' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">{t('common.currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">{t('settingsAdmin.profile.newPasswordLabel')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">{t('settingsAdmin.profile.confirmNewPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPassword ? t('settingsAdmin.profile.updatingPassword') : t('settingsAdmin.profile.updatePassword')}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
