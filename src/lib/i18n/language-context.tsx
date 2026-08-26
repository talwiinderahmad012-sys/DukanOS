'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations, Language } from './translations';

export type TranslationDict = typeof translations.EN | typeof translations.UR;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
  t: (path: string, fallback?: string) => string;
  dict: TranslationDict;
  formatCurrency: (amount: number | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'dukaanos_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('EN');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    document.documentElement.classList.add('notranslate');
    document.documentElement.setAttribute('translate', 'no');
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && (saved === 'EN' || saved === 'UR')) {
      setLanguageState(saved);
      document.documentElement.lang = saved === 'UR' ? 'ur' : 'en';
      document.documentElement.dir = saved === 'UR' ? 'rtl' : 'ltr';
      if (saved === 'UR') {
        document.documentElement.classList.add('lang-ur');
      } else {
        document.documentElement.classList.remove('lang-ur');
      }
    }
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.classList.add('notranslate');
      document.documentElement.setAttribute('translate', 'no');
      document.documentElement.lang = newLang === 'UR' ? 'ur' : 'en';
      document.documentElement.dir = newLang === 'UR' ? 'rtl' : 'ltr';
      if (newLang === 'UR') {
        document.documentElement.classList.add('lang-ur');
      } else {
        document.documentElement.classList.remove('lang-ur');
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'EN' ? 'UR' : 'EN');
  }, [language, setLanguage]);

  const isRTL = language === 'UR';

  const dict = useMemo(() => {
    return translations[language] || translations.EN;
  }, [language]);

  const t = useCallback(
    (path: string, fallback?: string): string => {
      const parts = path.split('.');
      let current: unknown = dict;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return fallback || path;
        }
      }
      return typeof current === 'string' ? current : fallback || path;
    },
    [dict]
  );

  const formatCurrency = useCallback(
    (amount: number | string): string => {
      const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
      const formatted = num.toLocaleString();
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
      dict,
      formatCurrency,
    }),
    [language, setLanguage, toggleLanguage, isRTL, t, dict, formatCurrency]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
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
      t: (path: string, fallback?: string) => {
        const parts = path.split('.');
        let current: unknown = fallbackDict;
        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = (current as Record<string, unknown>)[part];
          } else {
            return fallback || path;
          }
        }
        return typeof current === 'string' ? current : fallback || path;
      },
      formatCurrency: (amount: number | string) => `Rs. ${amount}`,
    };
  }
  return context;
}
