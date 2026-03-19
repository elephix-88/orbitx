import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string | number;
  onChange?: (_value: string | number) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  placeholder = "Select an option",
  className = "",
  id,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  // Position state for the dropdown
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current && isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  // Update position on open and scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string | number) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  // Stop event propagation to prevent clicks from reaching parent elements (like canvas)
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Render dropdown in portal
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdown = (
      <AnimatePresence>
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={dropdownStyle}
          className="overflow-hidden rounded-sm bg-white dark:bg-slate-900 shadow-sm border border-[#A8DADC] dark:border-slate-700 focus:outline-none"
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onMouseUp={stopPropagation}
        >
          <div className="max-h-60 overflow-auto py-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <div
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!option.disabled) handleSelect(option.value);
                  }}
                  onMouseDown={stopPropagation}
                  className={`
                    relative cursor-pointer select-none py-2.5 pl-4 pr-9 text-sm transition-colors
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-50 dark:hover:bg-brand-900/20'}
                    ${isSelected ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400 font-medium' : 'text-slate-700 dark:text-slate-300'}
                  `}
                >
                  <span className="block truncate">
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-brand-600 dark:text-brand-400">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-[#1D3557] dark:text-slate-200 mb-2"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {/* Trigger Button */}
        <button
          ref={buttonRef}
          type="button"
          id={inputId}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
          onMouseDown={stopPropagation}
          disabled={disabled}
          className={`
            relative w-full text-left cursor-pointer
            flex items-center justify-between
            rounded-sm px-4 py-3 text-sm font-medium transition-all duration-200
            bg-white dark:bg-slate-900
            border border-[#A8DADC] dark:border-slate-700/50
            hover:bg-white dark:hover:bg-slate-800
            hover:border-[#457B9D] dark:hover:border-[#457B9D]
            focus:outline-none focus:border-[#1D3557] focus:border-2 focus:ring-0
            ${isOpen ? 'border-2 border-[#1D3557]' : ''}
            ${error ? 'border-[#E63946] focus:border-[#E63946]' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}
          `}
        >
          <span className={`block truncate ${!selectedOption ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="pointer-events-none flex items-center pl-2">
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {/* Dropdown Menu rendered via portal */}
        {renderDropdown()}
      </div>

      {(error || helperText) && (
        <p
          className={`mt-1.5 text-sm ${
            error ? 'text-red-500 font-medium' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};
