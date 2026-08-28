'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Smartphone, 
  Zap
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { 
  updateNotificationPreferencesAction, 
  triggerDailyDigestAction 
} from '@/app/actions/notification.actions';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  isPushNotificationSupported, 
  getCurrentPushSubscription 
} from '@/lib/push/push-client';

export function NotificationPreferencesView({
  businessId,
  initialPreferences,
  isOwnerOrManager,
}: {
  businessId: string;
  initialPreferences: any;
  isOwnerOrManager: boolean;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestMessage, setDigestMessage] = useState<string | null>(null);

  // Web Push State
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushActive, setIsPushActive] = useState(false);
  const [pushToggling, setPushToggling] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    setIsPushSupported(isPushNotificationSupported());
    getCurrentPushSubscription().then((sub) => {
      setIsPushActive(!!sub && initialPreferences.webPushEnabled);
    });
  }, [initialPreferences]);

  const handleToggleWebPush = async () => {
    setPushToggling(true);
    setPushError(null);

    try {
      if (isPushActive) {
        await unsubscribeFromPushNotifications(businessId);
        setIsPushActive(false);
        setPreferences((prev: any) => ({ ...prev, webPushEnabled: false }));
      } else {
        await subscribeToPushNotifications(businessId);
        setIsPushActive(true);
        setPreferences((prev: any) => ({ ...prev, webPushEnabled: true }));
      }
    } catch (err: any) {
      setPushError(tm(err.message) || t('settingsAdmin.notifications.pushToggleFailed'));
    } finally {
      setPushToggling(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const res = await updateNotificationPreferencesAction(businessId, preferences);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    }
    setSaving(false);
  };

  const handleTriggerTestDigest = async () => {
    setDigestLoading(true);
    setDigestMessage(null);

    const res = await triggerDailyDigestAction(businessId);
    if (res.success && res.data) {
      setDigestMessage((res.data as any).summary || t('settingsAdmin.notifications.digestSuccess'));
      router.refresh();
    } else {
      setDigestMessage(tm(res.message) || t('settingsAdmin.notifications.digestFailed'));
    }
    setDigestLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settingsAdmin.notifications.title')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {t('settingsAdmin.notifications.description')}
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Section 1: Browser Web Push Notifications */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary-soft text-gray-900 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">{t('settingsAdmin.notifications.webPushTitle')}</h2>
              <p className="text-xs text-gray-500">
                {t('settingsAdmin.notifications.webPushDescription')}
              </p>
            </div>
          </div>

          {pushError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pushError}</span>
            </div>
          )}

          {!isPushSupported ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600">
              {t('settingsAdmin.notifications.pushNotSupported')}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
              <div>
                <span className="text-xs font-bold text-gray-800 block">
                  {t('settingsAdmin.notifications.devicePushLabel', {
                    status: isPushActive
                      ? t('settingsAdmin.notifications.pushActive')
                      : t('settingsAdmin.notifications.pushDisabled'),
                  })}
                </span>
                <span className="text-[11px] text-gray-500">
                  {t('settingsAdmin.notifications.devicePushHint')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleWebPush}
                disabled={pushToggling}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  isPushActive
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                    : 'bg-primary hover:bg-primary-hover text-on-primary'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {pushToggling
                    ? t('settingsAdmin.notifications.updatingPush')
                    : isPushActive
                    ? t('settingsAdmin.notifications.disablePush')
                    : t('settingsAdmin.notifications.enablePush')}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Alert Categories Configuration */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3">
            {t('settingsAdmin.notifications.alertCategories')}
          </h2>

          <div className="divide-y divide-gray-100">
            {/* Low Stock Alerts */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-xs text-gray-900 block">{t('settingsAdmin.notifications.lowStockTitle')}</span>
                <span className="text-[11px] text-gray-500">{t('settingsAdmin.notifications.lowStockHint')}</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.lowStockAlerts}
                onChange={(e) => setPreferences({ ...preferences, lowStockAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>

            {/* Customer Feedback Alerts */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-xs text-gray-900 block">{t('settingsAdmin.notifications.feedbackTitle')}</span>
                <span className="text-[11px] text-gray-500">{t('settingsAdmin.notifications.feedbackHint')}</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.feedbackAlerts}
                onChange={(e) => setPreferences({ ...preferences, feedbackAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>

            {/* Employee Alerts */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-xs text-gray-900 block">{t('settingsAdmin.notifications.employeeAlertsTitle')}</span>
                <span className="text-[11px] text-gray-500">{t('settingsAdmin.notifications.employeeAlertsHint')}</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.employeeAlerts}
                onChange={(e) => setPreferences({ ...preferences, employeeAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>

            {/* Team Messages */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-xs text-gray-900 block">{t('settingsAdmin.notifications.messagesTitle')}</span>
                <span className="text-[11px] text-gray-500">{t('settingsAdmin.notifications.messagesHint')}</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.messagesAlerts}
                onChange={(e) => setPreferences({ ...preferences, messagesAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </label>

            {/* Financial Alerts (Owner Only) */}
            {isOwnerOrManager && (
              <>
                <label className="py-3 flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">{t('settingsAdmin.notifications.salesDropTitle')}</span>
                    <span className="text-[11px] text-gray-500">{t('settingsAdmin.notifications.salesDropHint')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.salesDropAlerts}
                    onChange={(e) => setPreferences({ ...preferences, salesDropAlerts: e.target.checked })}
                    className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
                  />
                </label>

                <label className="py-3 flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">{t('settingsAdmin.notifications.creditTitle')}</span>
                    <span className="text-[11px] text-gray-500">{t('settingsAdmin.notifications.creditHint')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.creditAlerts}
                    onChange={(e) => setPreferences({ ...preferences, creditAlerts: e.target.checked })}
                    className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Owner Daily Business Digest (Owner Only) */}
        {isOwnerOrManager && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="font-bold text-gray-900 text-base">{t('settingsAdmin.notifications.digestTitle')}</h2>
                <p className="text-xs text-gray-500">
                  {t('settingsAdmin.notifications.digestDescription')}
                </p>
              </div>

              <input
                type="checkbox"
                checked={preferences.dailyDigest}
                onChange={(e) => setPreferences({ ...preferences, dailyDigest: e.target.checked })}
                className="w-4 h-4 rounded text-gray-900 focus:ring-primary"
              />
            </div>

            {preferences.dailyDigest && (
              <div className="space-y-4 pt-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-700 block">{t('settingsAdmin.notifications.digestTimeLabel')}</span>
                    <span className="text-[11px] text-gray-400">{t('settingsAdmin.notifications.digestTimeHint')}</span>
                  </div>
                  <input
                    type="time"
                    value={preferences.dailyDigestTime || '09:00'}
                    onChange={(e) => setPreferences({ ...preferences, dailyDigestTime: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="p-4 bg-primary-soft/50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-blue-950 block">{t('settingsAdmin.notifications.testDigestTitle')}</span>
                    <span className="text-[11px] text-gray-950">{t('settingsAdmin.notifications.testDigestHint')}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerTestDigest}
                    disabled={digestLoading}
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{digestLoading ? t('settingsAdmin.notifications.generatingDigest') : t('settingsAdmin.notifications.runTestDigest')}</span>
                  </button>
                </div>

                {digestMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                    {digestMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> {t('settingsAdmin.notifications.savedMsg')}
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{saving ? t('settingsAdmin.notifications.savingPreferences') : t('settingsAdmin.notifications.savePreferences')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
