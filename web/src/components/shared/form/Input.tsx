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
 className="block text-[12.5px] font-medium text-text-2 mb-1.5"
 >
 {label}
 {required && <span className="text-danger ml-0.5">*</span>}
 </label>
 )}
 <div className="relative">
 <input
 id={inputId}
 ref={ref}
 aria-invalid={!!error}
 aria-describedby={
 error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
 }
 className={cn(
 'block w-full rounded-md px-2.5 py-1.5',
 'text-[13px] text-text-1',
 'placeholder:text-text-3',
 'bg-bg-card',
 'border border-line-1',
 'focus:outline-none focus:border-blue-border focus:ring-[3px] focus:ring-blue-soft',
 'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-muted',
 'transition-shadow',
 error ? 'border-danger-border focus:border-danger-border' : 'hover:border-line-2',
 className
 )}
 {...props}
 />
 {error && (
 <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
 <AlertCircle className="w-4 h-4 text-danger" aria-hidden="true" />
 </div>
 )}
 </div>
 {(error || helperText) && (
 <p
 id={error ? `${inputId}-error` : `${inputId}-helper`}
 className={cn('mt-1.5 text-[12px]', error ? 'text-danger' : 'text-text-3')}
 >
 {error || helperText}
 </p>
 )}
 </div>
 );
 }
);

Input.displayName = 'Input';
