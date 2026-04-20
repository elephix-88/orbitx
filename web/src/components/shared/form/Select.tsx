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
 className="overflow-hidden rounded-lg bg-bg-card shadow-lg border border-line-1 focus:outline-none"
 onClick={stopPropagation}
 onMouseDown={stopPropagation}
 onMouseUp={stopPropagation}
 >
 <div className="max-h-60 overflow-auto py-1">
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
 ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-muted'}
 ${isSelected ? 'bg-blue-soft text-blue-primary font-medium' : 'text-text-1'}
 `}
 >
 <span className="block truncate">
 {option.label}
 </span>
 {isSelected && (
 <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-primary">
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
 className="block text-sm font-medium text-text-1 mb-2"
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
 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200
 bg-bg-page
 border border-line-1
 hover:border-neutral-600
 focus:outline-none focus:border-blue-primary focus:ring-1 focus:ring-blue-soft
 ${isOpen ? 'border-blue-primary ring-1 ring-blue-soft' : ''}
 ${error ? 'border-danger-border focus:border-danger-border' : ''}
 ${disabled ? 'opacity-50 cursor-not-allowed bg-bg-muted' : ''}
 `}
 >
 <span className={`block truncate ${!selectedOption ? 'text-text-3' : 'text-text-1'}`}>
 {selectedOption ? selectedOption.label : placeholder}
 </span>
 <span className="pointer-events-none flex items-center pl-2">
 <ChevronDown
 className={`h-4 w-4 text-text-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
 />
 </span>
 </button>

 {/* Dropdown Menu rendered via portal */}
 {renderDropdown()}
 </div>

 {(error || helperText) && (
 <p
 className={`mt-1.5 text-sm ${
 error ? 'text-error font-medium' : 'text-text-2'
 }`}
 >
 {error || helperText}
 </p>
 )}
 </div>
 );
};
