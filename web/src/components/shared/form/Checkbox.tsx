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
            "w-5 h-5 rounded-md border-2 transition-all duration-200 ease-out",
            "bg-neutral-900",
            "border-neutral-600",
            "peer-focus:ring-1 peer-focus:ring-primary-400/20 peer-focus:border-primary-400",
            checked
              ? "bg-primary-400 border-primary-400"
              : "group-hover:border-neutral-500",
            error && "border-error"
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
                <Check className="w-3.5 h-3.5 text-neutral-950 stroke-[3]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {label && (
          <span className={cn(
            "text-sm text-text-secondary transition-colors",
            checked && "text-text-primary font-medium",
            error && "text-error"
          )}>
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
