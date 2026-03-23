import React from 'react';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  error,
  helperText,
  children,
  className,
  ...rest
}) => {
  return (
    <div className={`bg-surface-secondary rounded-md p-3 ring-1 ring-border-subtle ${className || ''}`} {...rest}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary mb-2">
        {label}
      </label>
      {children}
      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? 'text-error' : 'text-text-secondary'}`}>{error || helperText}</p>
      )}
    </div>
  );
};

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full h-11 px-3 rounded-md ring-1 ${hasError ? 'ring-error/50' : 'ring-border-subtle'} bg-surface-primary focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm placeholder:text-text-tertiary text-text-primary transition-all ${className || ''}`}
      {...props}
    />
  )
);
TextInput.displayName = 'TextInput';

export const SelectInput = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }>(
  ({ className, hasError, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={`w-full h-11 pr-10 pl-3 rounded-md ring-1 ${hasError ? 'ring-error/50' : 'ring-border-subtle'} bg-surface-primary appearance-none focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm text-text-primary transition-all ${className || ''}`}
        {...props}
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
      </svg>
    </div>
  )
);
SelectInput.displayName = 'SelectInput';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }>(
  ({ className, hasError, ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full bg-surface-primary ring-1 ${hasError ? 'ring-error/50' : 'ring-border-subtle'} p-4 rounded-md placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 text-base font-mono text-text-primary shadow-sm transition-all ${className || ''}`}
      {...props}
    />
  )
);
TextArea.displayName = 'TextArea';
