import type { ComponentProps, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from './cn';

const INPUT_BASE =
  'w-full rounded-input border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

const INVALID = 'border-red-500 focus:border-red-500 focus:ring-red-500';

export function inputClasses(invalid?: boolean, className?: string): string {
  return cn(INPUT_BASE, invalid && INVALID, className);
}

export interface InputProps extends ComponentProps<'input'> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...props }: InputProps) {
  return <input className={inputClasses(invalid, className)} aria-invalid={invalid || undefined} {...props} />;
}

export interface TextareaProps extends ComponentProps<'textarea'> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(inputClasses(invalid, className), 'min-h-[80px]')}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export interface SelectProps extends ComponentProps<'select'> {
  invalid?: boolean;
}

export function Select({ invalid, className, children, ...props }: SelectProps) {
  return (
    <select
      className={inputClasses(invalid, cn('pe-8', className))}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn('h-4 w-4 shrink-0 rounded border-gray-300 accent-primary', className)}
      {...props}
    />
  );
}

export function Radio({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type="radio"
      className={cn('h-4 w-4 shrink-0 border-gray-300 accent-primary', className)}
      {...props}
    />
  );
}

export interface FieldProps extends ComponentProps<'div'> {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Field({ label, htmlFor, required, hint, error, className, children, ...props }: FieldProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ms-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface SearchInputProps extends Omit<InputProps, 'className'> {
  className?: string;
  iconClassName?: string;
}

export function SearchInput({ className, iconClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn('pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400', iconClassName)}
        aria-hidden="true"
      />
      <Input {...props} className="ps-9" />
    </div>
  );
}
