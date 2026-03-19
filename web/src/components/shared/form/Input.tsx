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
            className="block text-[11px] font-bold uppercase tracking-wider text-[#8896AD] mb-2"
          >
            {label}
            {required && <span className="text-[#FF4D6A] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={cn(
              'block w-full rounded-[4px] px-3.5 py-2.5',
              'text-sm text-[#E8ECF4]',
              'placeholder:text-[#506080]',
              'bg-[#0F1729]',
              'border border-[rgba(0,212,255,0.12)]',
              'focus:outline-none focus:border-[rgba(0,212,255,0.4)] focus:shadow-[0_0_8px_rgba(0,212,255,0.1)] focus:ring-0',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#0F1729]/50',
              'transition-all duration-200',
              error
                ? 'border-[#FF4D6A] focus:border-[#FF4D6A] focus:shadow-[0_0_8px_rgba(255,77,106,0.1)]'
                : 'hover:border-[rgba(0,212,255,0.25)]',
              className
            )}
            {...props}
          />
          {error && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <AlertCircle className="w-4 h-4 text-[#FF4D6A]" aria-hidden="true" />
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-[#FF4D6A]' : 'text-[#8896AD]'
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