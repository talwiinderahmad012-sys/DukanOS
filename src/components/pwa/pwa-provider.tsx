'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  X, 
  Share, 
  AlertTriangle,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { processSyncQueue } from '@/lib/offline/sync-manager';
import { useTranslation } from '@/lib/i18n/language-context';

export type NetworkStatus = 'ONLINE' | 'OFFLINE' | 'RECONNECTING';

interface PWAContextType {
  networkStatus: NetworkStatus;
  isInstallable: boolean;
  promptInstall: () => void;
}

const PWAContext = createContext<PWAContextType>({
  networkStatus: 'ONLINE',
  isInstallable: false,
  promptInstall: () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

export function PWAProvider({
  children,
  businessId,
}: {
  children: React.ReactNode;
  businessId?: string;
}) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('ONLINE');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [showIosHint, setShowIosHint] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // 2. Track Online / Offline network state
    const handleOnline = () => {
      setNetworkStatus('RECONNECTING');
      setTimeout(() => {
        setNetworkStatus('ONLINE');
        // Sync every queued offline transaction. businessId is optional:
        // queued records carry their own businessId, so auto-sync works even
        // when the provider is mounted globally without one.
        processSyncQueue(businessId);
      }, 1500);
    };

    const handleOffline = () => {
      setNetworkStatus('OFFLINE');
    };

    if (typeof window !== 'undefined') {
      if (!navigator.onLine) {
        setNetworkStatus('OFFLINE');
      }

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // 3. Handle PWA Install Prompt Event (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('dukaanos_install_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. iOS Safari Check
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone =
      (window.navigator as any).standalone ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isIos && !isStandalone) {
      const iosDismissed = localStorage.getItem('dukaanos_ios_hint_dismissed');
      if (!iosDismissed) {
        setShowIosHint(true);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [businessId]);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const dismissInstallBanner = () => {
    localStorage.setItem('dukaanos_install_dismissed', 'true');
    setShowInstallBanner(false);
  };

  const dismissIosHint = () => {
    localStorage.setItem('dukaanos_ios_hint_dismissed', 'true');
    setShowIosHint(false);
  };

  return (
    <PWAContext.Provider
      value={{
        networkStatus,
        isInstallable: !!deferredPrompt,
        promptInstall,
      }}
    >
      {/* Global Connection Warning Banner */}
      {networkStatus === 'OFFLINE' && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-0 z-50">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-900" />
            <span>
              <strong>{t('ui.offlineTitle')}</strong> {t('ui.offlineMessage')}
            </span>
          </div>
        </div>
      )}

      {networkStatus === 'RECONNECTING' && (
        <div className="bg-primary text-on-primary px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs sticky top-0 z-50 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{t('ui.reconnectingMessage')}</span>
        </div>
      )}

      {/* PWA Install Promotion Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 end-4 z-50 bg-white border border-blue-200 rounded-3xl p-4 shadow-2xl max-w-sm flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs font-bold text-base">
              D
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-xs">{t('ui.installAppTitle')}</h4>
              <p className="text-[11px] text-gray-500">{t('ui.installAppMessage')}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={promptInstall}
              className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('ui.install')}</span>
            </button>
            <button
              onClick={dismissInstallBanner}
              aria-label={t('common.close')}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Add-To-Home-Screen Hint */}
      {showIosHint && (
        <div className="fixed bottom-4 start-4 end-4 z-50 bg-gray-900 text-white rounded-2xl p-3.5 shadow-2xl max-w-md mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Share className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-[11px] text-gray-200 leading-snug">
              {t('ui.iosHintLead')}{' '}
              <strong className="text-white">{t('ui.iosHintShare')}</strong>{' '}
              {t('ui.iosHintThen')}{' '}
              <strong className="text-white">{t('ui.iosHintHomeScreen')}</strong>
              {t('ui.iosHintEnd')}
            </p>
          </div>
          <button
            onClick={dismissIosHint}
            aria-label={t('common.close')}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {children}
    </PWAContext.Provider>
  );
}

export function NetworkStatusBadge() {
  const { networkStatus } = usePWA();
  const { t } = useTranslation();

  if (networkStatus === 'OFFLINE') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
        <WifiOff className="w-3 h-3 text-amber-600" />
        <span>{t('ui.statusOffline')}</span>
      </span>
    );
  }

  if (networkStatus === 'RECONNECTING') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-gray-900 border border-blue-300 animate-pulse">
        <RefreshCw className="w-3 h-3 animate-spin text-gray-900" />
        <span>{t('ui.statusSyncing')}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      <span>{t('ui.statusOnline')}</span>
    </span>
  );
}
