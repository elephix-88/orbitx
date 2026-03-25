import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, required, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary mb-2"
          >
            {label}
            {required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={cn(
              'block w-full rounded-lg px-3.5 py-2.5',
              'text-sm text-text-primary',
              'placeholder:text-neutral-600',
              'bg-neutral-900',
              'border border-neutral-700',
              'focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-tertiary',
              'transition-colors duration-200',
              error
                ? 'border-error focus:border-error'
                : 'hover:border-neutral-600',
              className
            )}
            {...props}
          />
          {error && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <AlertCircle className="w-4 h-4 text-error" aria-hidden="true" />
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-error' : 'text-text-secondary'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
