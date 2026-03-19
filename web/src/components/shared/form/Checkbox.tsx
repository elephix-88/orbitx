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
            "w-5 h-5 rounded-[4px] border transition-all duration-200 ease-out",
            "bg-[#0F1729]",
            "border-[rgba(0,212,255,0.2)]",
            "peer-focus:ring-2 peer-focus:ring-[rgba(0,212,255,0.2)] peer-focus:border-[rgba(0,212,255,0.4)]",
            checked
              ? "bg-[#00D4FF] border-[#00D4FF]"
              : "group-hover:border-[rgba(0,212,255,0.35)]",
            error && "border-[#FF4D6A]"
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
            "text-sm text-[#8896AD] transition-colors",
            checked && "text-[#E8ECF4] font-medium",
            error && "text-[#FF4D6A]"
          )}>
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
