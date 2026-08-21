'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Send, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Smartphone, 
  RefreshCw,
  Zap
} from 'lucide-react';
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
      setPushError(err.message || 'Failed to toggle web push notifications.');
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
      setDigestMessage((res.data as any).summary || 'Daily digest generated successfully!');
      router.refresh();
    } else {
      setDigestMessage(res.message || 'Failed to generate digest.');
    }
    setDigestLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification & Alert Preferences</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Configure real-time browser push notifications, operational alerts, and daily business digests.
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Section 1: Browser Web Push Notifications */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Browser Web Push Notifications</h2>
              <p className="text-xs text-gray-500">
                Receive high-priority operational alerts and digests on your mobile phone or desktop.
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
              Web Push is not supported in this browser environment. In-app notifications remain fully active.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
              <div>
                <span className="text-xs font-bold text-gray-800 block">
                  Device Push Alerts: {isPushActive ? 'Active & Enabled' : 'Disabled'}
                </span>
                <span className="text-[11px] text-gray-500">
                  Critical stock alerts, complaints, and daily reports will be pushed to this device.
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleWebPush}
                disabled={pushToggling}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  isPushActive
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{pushToggling ? 'Updating...' : isPushActive ? 'Disable Push on This Device' : 'Enable Push Alerts'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Alert Categories Configuration */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3">
            Operational Alert Categories
          </h2>

          <div className="divide-y divide-gray-100">
            {/* Low Stock Alerts */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-xs text-gray-900 block">Low Stock & Inventory Depletion</span>
                <span className="text-[11px] text-gray-500">Triggered when products fall below their minimum inventory thresholds.</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.lowStockAlerts}
                onChange={(e) => setPreferences({ ...preferences, lowStockAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            {/* Customer Feedback Alerts */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-xs text-gray-900 block">Low Customer Reviews (≤ 2 Stars)</span>
                <span className="text-[11px] text-gray-500">Alerts when a dissatisfied customer submits low review feedback.</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.feedbackAlerts}
                onChange={(e) => setPreferences({ ...preferences, feedbackAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            {/* Employee Alerts */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-xs text-gray-900 block">Staff Leave Requests & Urgent Complaints</span>
                <span className="text-[11px] text-gray-500">Alerts for pending staff leave approvals and urgent grievances.</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.employeeAlerts}
                onChange={(e) => setPreferences({ ...preferences, employeeAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            {/* Team Messages */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-xs text-gray-900 block">Internal Team Messages</span>
                <span className="text-[11px] text-gray-500">Notifications when a colleague sends an internal direct message.</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.messagesAlerts}
                onChange={(e) => setPreferences({ ...preferences, messagesAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            {/* Financial Alerts (Owner Only) */}
            {isOwnerOrManager && (
              <>
                <label className="py-3 flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">Sales & Margin Decline Alerts</span>
                    <span className="text-[11px] text-gray-500">Advisor warnings for sudden drops in daily or weekly revenue.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.salesDropAlerts}
                    onChange={(e) => setPreferences({ ...preferences, salesDropAlerts: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="py-3 flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">Customer Credit & Udhaar Risk Alerts</span>
                    <span className="text-[11px] text-gray-500">Alerts when receivables exceed safe store credit limits.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.creditAlerts}
                    onChange={(e) => setPreferences({ ...preferences, creditAlerts: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
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
                <h2 className="font-bold text-gray-900 text-base">Owner Daily Business Digest</h2>
                <p className="text-xs text-gray-500">
                  Comprehensive morning summary of yesterday's sales, gross profit, growth, and operational alerts.
                </p>
              </div>

              <input
                type="checkbox"
                checked={preferences.dailyDigest}
                onChange={(e) => setPreferences({ ...preferences, dailyDigest: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            {preferences.dailyDigest && (
              <div className="space-y-4 pt-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-700 block">Preferred Morning Delivery Time</span>
                    <span className="text-[11px] text-gray-400">Scheduled according to your store's timezone.</span>
                  </div>
                  <input
                    type="time"
                    value={preferences.dailyDigestTime || '09:00'}
                    onChange={(e) => setPreferences({ ...preferences, dailyDigestTime: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-blue-950 block">Test Daily Digest Generation</span>
                    <span className="text-[11px] text-blue-700">Manually generate yesterday's digest now for testing.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerTestDigest}
                    disabled={digestLoading}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{digestLoading ? 'Generating...' : 'Run Test Digest'}</span>
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
              <Check className="w-4 h-4" /> Preferences saved successfully!
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{saving ? 'Saving Changes...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
