'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from './cn';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
  id?: string;
}

export function Select({
  name,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  className,
  placeholder,
  'aria-label': ariaLabel,
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string | undefined>(value);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find((opt) => opt.value === currentValue);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle scroll into view when navigating with keyboard
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listboxRef.current) {
      const optionEl = listboxRef.current.children[focusedIndex] as HTMLElement;
      if (optionEl) {
        optionEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = (newValue: string) => {
    setInternalValue(newValue);
    onChange?.(newValue);
    setIsOpen(false);
  };

  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      const idx = options.findIndex((opt) => opt.value === currentValue);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (focusedIndex >= 0 && focusedIndex < options.length) {
            handleSelect(options[focusedIndex].value);
          }
        } else {
          toggleOpen();
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          toggleOpen();
        } else {
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          toggleOpen();
        } else {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full text-start', className)}
      id={id}
    >
      {/* Hidden input for native form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue ?? ''}
          required={required}
        />
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder || 'Select option'}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none transition-colors focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed',
          !selectedOption && 'text-gray-500',
          isOpen && 'ring-2 ring-primary border-primary'
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder || 'Select...'}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-gray-500 opacity-50 ms-2" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 opacity-50 ms-2" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg py-1">
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className="outline-none"
          >
            {options.map((option, index) => {
              const isSelected = option.value === currentValue;
              const isFocused = index === focusedIndex;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center py-2.5 px-4 outline-none transition-colors',
                    isFocused ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    isSelected && 'font-medium text-primary'
                  )}
                >
                  <span className="flex-grow truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="ms-2 h-4 w-4 shrink-0 text-primary" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
