'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/language-context';

export function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (selected: 'EN' | 'UR') => {
    setLanguage(selected);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 items-center justify-center gap-1.5 px-3 rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-bold text-xs shadow-sm"
        title={t('nav.switchLanguage')}
        aria-label={t('nav.selectLanguage')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="text-xs font-semibold">{language === 'UR' ? 'اردو' : 'EN'}</span>
      </button>

      {isOpen && (
        <div 
          className="absolute end-0 mt-2 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95" 
          role="menu"
        >
          <div className="py-1">
            <button
              onClick={() => handleSelect('EN')}
              className={`w-full text-start px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                language === 'EN' 
                  ? 'bg-primary-soft text-gray-950 dark:bg-blue-900/20 dark:text-blue-400 font-semibold' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              role="menuitem"
            >
              <span>{t('common.english')}</span>
              {language === 'EN' && <span className="text-xs">✓</span>}
            </button>
            <button
              onClick={() => handleSelect('UR')}
              className={`w-full text-start px-4 py-2.5 text-sm transition-colors flex items-center justify-between font-medium ${
                language === 'UR' 
                  ? 'bg-primary-soft text-gray-950 dark:bg-blue-900/20 dark:text-blue-400 font-semibold' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              role="menuitem"
            >
              <span className="urdu-font">{t('common.urdu')}</span>
              {language === 'UR' && <span className="text-xs">✓</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
