'use client';

import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { useState, useRef, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape
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

  const handleSelect = (selected: 'light' | 'dark' | 'system') => {
    setTheme(selected);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="Toggle Theme"
        aria-label="Toggle Theme"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95" 
          role="menu"
        >
          <div className="py-1">
            <button
              onClick={() => handleSelect('light')}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                theme === 'light' 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              role="menuitem"
            >
              <Sun className="h-4 w-4" />
              <span>Light</span>
            </button>
            <button
              onClick={() => handleSelect('dark')}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                theme === 'dark' 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              role="menuitem"
            >
              <Moon className="h-4 w-4" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => handleSelect('system')}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                theme === 'system' 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              role="menuitem"
            >
              <Laptop className="h-4 w-4" />
              <span>System</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
