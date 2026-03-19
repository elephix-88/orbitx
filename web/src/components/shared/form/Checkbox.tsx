import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, checked, disabled, onChange, ...props }, ref) => {
    return (
      <label className={cn(
        "inline-flex items-start gap-3 cursor-pointer group select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}>
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            ref={ref}
            {...props}
          />
          
          {/* Checkbox Background */}
          <div className={cn(
            "w-5 h-5 rounded-none border-2 transition-all duration-200 ease-out",
            "bg-white dark:bg-slate-900",
            "border-[#1D3557] dark:border-slate-600",
            "peer-focus:ring-2 peer-focus:ring-[#1D3557]/20 peer-focus:border-[#1D3557]",
            checked
              ? "bg-[#E63946] border-[#E63946] dark:bg-[#E63946] dark:border-[#E63946]"
              : "group-hover:border-[#457B9D] dark:group-hover:border-[#457B9D]",
            error && "border-red-500"
          )} />

          {/* Checkmark Icon */}
          <AnimatePresence>
            {checked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "backOut" }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {label && (
          <span className={cn(
            "text-sm text-slate-700 dark:text-slate-300 transition-colors",
            checked && "text-slate-900 dark:text-slate-100 font-medium",
            error && "text-red-500"
          )}>
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
