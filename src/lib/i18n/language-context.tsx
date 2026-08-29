'use client';

import React, { createContext, useContext, useSyncExternalStore, useLayoutEffect, useCallback, useMemo } from 'react';
import { translations, Language } from './translations';
import { SERVER_MESSAGES } from './server-messages';

import { LANGUAGE_STORAGE_KEY, LANGUAGE_COOKIE_KEY } from './constants';

export { LANGUAGE_STORAGE_KEY };

export type TranslationDict = typeof translations.EN | typeof translations.UR;

export type TranslationVars = Record<string, string | number>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
  t: (path: string, varsOrFallback?: TranslationVars | string) => string;
  tm: (message: string | null | undefined) => string;
  dict: TranslationDict;
  formatCurrency: (amount: number | string) => string;
  formatNumber: (value: number | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function interpolate(value: string, vars?: TranslationVars): string {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, key: string) => {
    return key in vars ? String(vars[key]) : match;
  });
}

function lookup(dict: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

function makeT(dict: unknown) {
  return (path: string, varsOrFallback?: TranslationVars | string): string => {
    const found = lookup(dict, path);
    if (found === undefined) {
      return typeof varsOrFallback === 'string' ? varsOrFallback : path;
    }
    return typeof varsOrFallback === 'string' ? found : interpolate(found, varsOrFallback);
  };
}

function applyLanguageToDocument(lang: Language): void {
  const root = document.documentElement;
  root.classList.add('notranslate');
  root.setAttribute('translate', 'no');
  root.lang = lang === 'UR' ? 'ur' : 'en';
  root.dir = lang === 'UR' ? 'rtl' : 'ltr';
  root.classList.toggle('lang-ur', lang === 'UR');
}

function readStoredLanguage(): Language | null {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === 'EN' || saved === 'UR' ? saved : null;
  } catch {
    return null;
  }
}

const LANGUAGE_CHANGE_EVENT = 'dukaanos-lang-change';

function subscribeToLanguage(callback: () => void): () => void {
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getLanguageSnapshot(): Language {
  return readStoredLanguage() ?? 'EN';
}

// Server-rendered language, injected from the language cookie by the root
// layout. During SSR and hydration React uses this snapshot so Urdu users
// receive Urdu markup/text on the very first render (no English flash).
let serverSnapshotLanguage: Language = 'EN';

function getServerLanguageSnapshot(): Language {
  return serverSnapshotLanguage;
}

function persistLanguageCookie(lang: Language): void {
  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // cookie unavailable — SSR locale simply stays at its previous value
  }
}

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  // Make the server snapshot match what the server actually rendered so the
  // hydration pass does not flip languages.
  serverSnapshotLanguage = initialLanguage ?? 'EN';

  // During SSR and hydration React uses the server snapshot, so the
  // initial client render matches the server HTML. After mount the stored
  // value from localStorage takes over without a hydration mismatch.
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );

  useLayoutEffect(() => {
    applyLanguageToDocument(language);
    // Keep the SSR cookie in sync with the persisted client choice so the
    // next server-rendered response uses the correct locale.
    persistLanguageCookie(language);
  }, [language]);

  const setLanguage = useCallback((newLang: Language) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch {
      // storage unavailable (private mode) — language still applies for session
    }
    persistLanguageCookie(newLang);
    applyLanguageToDocument(newLang);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'EN' ? 'UR' : 'EN');
  }, [language, setLanguage]);

  const isRTL = language === 'UR';

  const dict = useMemo(() => {
    return translations[language] || translations.EN;
  }, [language]);

  const t = useMemo(() => makeT(dict), [dict]);

  const tm = useCallback(
    (message: string | null | undefined): string => {
      if (!message) return '';
      const map = SERVER_MESSAGES[language];
      return map[message] ?? message;
    },
    [language]
  );

  const formatNumber = useCallback(
    (value: number | string): string => {
      const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
      return num.toLocaleString(language === 'UR' ? 'ur-PK' : 'en-PK');
    },
    [language]
  );

  const formatCurrency = useCallback(
    (amount: number | string): string => {
      const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
      const formatted = num.toLocaleString(language === 'UR' ? 'ur-PK' : 'en-PK');
      if (language === 'UR') {
        return `${formatted} روپے`;
      }
      return `Rs. ${formatted}`;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      isRTL,
      t,
      tm,
      dict,
      formatCurrency,
      formatNumber,
    }),
    [language, setLanguage, toggleLanguage, isRTL, t, tm, dict, formatCurrency, formatNumber]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider
    const fallbackDict = translations.EN;
    return {
      language: 'EN' as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      isRTL: false,
      dict: fallbackDict as TranslationDict,
      t: makeT(fallbackDict),
      tm: (message: string | null | undefined) => message ?? '',
      formatCurrency: (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
        return `Rs. ${num.toLocaleString()}`;
      },
      formatNumber: (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
        return num.toLocaleString();
      },
    };
  }
  return context;
}
