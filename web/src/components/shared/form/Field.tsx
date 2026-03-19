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
    <div className={`bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 ring-1 ring-slate-200/50 dark:ring-slate-700/50 ${className || ''}`} {...rest}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-2">
        {label}
      </label>
      {children}
      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{error || helperText}</p>
      )}
    </div>
  );
};

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full h-11 px-3 rounded-2xl ring-1 ${hasError ? 'ring-error/50' : 'ring-slate-200/50 dark:ring-slate-600/50'} bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white/80 dark:focus:bg-slate-800/80 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 transition-all ${className || ''}`}
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
        className={`w-full h-11 pr-10 pl-3 rounded-2xl ring-1 ${hasError ? 'ring-error/50' : 'ring-slate-200/50 dark:ring-slate-600/50'} bg-white/50 dark:bg-slate-800/50 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white/80 dark:focus:bg-slate-800/80 shadow-sm text-slate-900 dark:text-slate-100 transition-all ${className || ''}`}
        {...props}
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
      className={`w-full bg-white/50 dark:bg-slate-800/50 ring-1 ${hasError ? 'ring-error/50' : 'ring-slate-200/50 dark:ring-slate-600/50'} p-4 rounded-2xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white/80 dark:focus:bg-slate-800/80 text-base font-mono text-slate-900 dark:text-slate-100 shadow-sm transition-all ${className || ''}`}
      {...props}
    />
  )
);
TextArea.displayName = 'TextArea';
