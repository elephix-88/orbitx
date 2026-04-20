import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format, differenceInDays } from 'date-fns';
import { Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
 startDate: string;
 endDate: string;
 onChange: (start: string, end: string) => void;
 maxDays?: number;
 error?: string | null;
 className?: string;
 compact?: boolean;
}

const formatDateForInput = (date: Date): string => {
 return date.toISOString().split('T')[0];
};

export const DateRangePicker = ({
 startDate,
 endDate,
 onChange,
 maxDays = 60,
 error,
 className,
 compact = false,
}: DateRangePickerProps) => {
 const [isOpen, setIsOpen] = useState(false);
 const [range, setRange] = useState<DateRange | undefined>(() => ({
 from: startDate ? new Date(startDate) : undefined,
 to: endDate ? new Date(endDate) : undefined,
 }));
 const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
 const buttonRef = useRef<HTMLButtonElement>(null);
 const dropdownRef = useRef<HTMLDivElement>(null);

 // Sync external props with internal state
 useEffect(() => {
 setRange({
 from: startDate ? new Date(startDate) : undefined,
 to: endDate ? new Date(endDate) : undefined,
 });
 }, [startDate, endDate]);

 // Update dropdown position when opened - with viewport boundary checking
 useEffect(() => {
 if (isOpen && buttonRef.current) {
 const rect = buttonRef.current.getBoundingClientRect();
 const dropdownWidth = 580; // Approximate width of 2-month calendar
 const dropdownHeight = 380; // Approximate height
 const padding = 8;

 // Calculate initial position
 let top = rect.bottom + 4;
 let left = rect.left;

 // Check if dropdown would overflow right edge
 if (left + dropdownWidth > window.innerWidth - padding) {
 left = Math.max(padding, window.innerWidth - dropdownWidth - padding);
 }

 // Check if dropdown would overflow bottom edge - show above if needed
 if (top + dropdownHeight > window.innerHeight - padding) {
 top = Math.max(padding, rect.top - dropdownHeight - 4);
 }

 setDropdownPosition({ top, left });
 }
 }, [isOpen]);

 // Close on outside click
 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 const target = e.target as Node;
 if (
 buttonRef.current && !buttonRef.current.contains(target) &&
 dropdownRef.current && !dropdownRef.current.contains(target)
 ) {
 setIsOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const handleSelect = (newRange: DateRange | undefined) => {
 setRange(newRange);
 if (newRange?.from && newRange?.to) {
 onChange(formatDateForInput(newRange.from), formatDateForInput(newRange.to));
 }
 };

 const displayText = range?.from && range?.to
 ? `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`
 : range?.from
 ? `${format(range.from, 'MMM d, yyyy')} - Select end`
 : 'Select dates';

 const daysDiff = range?.from && range?.to
 ? differenceInDays(range.to, range.from)
 : 0;

 // Calculate max selectable date based on start date
 const getDisabledDates = () => {
 const disabled = [{ after: new Date() }];
 if (range?.from) {
 const maxDate = new Date(range.from.getTime() + maxDays * 24 * 60 * 60 * 1000);
 if (maxDate < new Date()) {
 disabled.push({ after: maxDate });
 }
 }
 return disabled;
 };

 const dropdownContent = (
 <AnimatePresence>
 {isOpen && (
 <motion.div
 ref={dropdownRef}
 initial={{ opacity: 0, y: -4, scale: 0.98 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -4, scale: 0.98 }}
 transition={{ duration: 0.15 }}
 style={{
 position: 'fixed',
 top: dropdownPosition.top,
 left: dropdownPosition.left,
 zIndex: 99999,
 }}
 className="bg-bg-page border border-line-1 rounded-xl shadow-2xl overflow-hidden"
 >
 <div className="p-3 date-range-picker-custom">
 <DayPicker
 mode="range"
 selected={range}
 onSelect={handleSelect}
 numberOfMonths={2}
 showOutsideDays={false}
 disabled={getDisabledDates()}
 />

 <div className="mt-3 pt-3 border-t border-line-1 flex items-center justify-between">
 <span className="text-[11px] text-text-3">
 Max range: {maxDays} days
 </span>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => {
 setRange(undefined);
 setIsOpen(false);
 }}
 className="px-3 py-1 text-xs text-text-2 hover:text-text-1 hover:bg-bg-card rounded-md transition-colors"
 >
 Clear
 </button>
 <button
 type="button"
 onClick={() => setIsOpen(false)}
 className="px-3 py-1 text-xs bg-blue-primary text-white hover:bg-blue-primary-hover rounded-md transition-colors"
 >
 Done
 </button>
 </div>
 </div>
 </div>

 {error && (
 <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/20">
 <span className="text-xs text-red-500">{error}</span>
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 );

 return (
 <div className={cn("relative", className)}>
 <button
 ref={buttonRef}
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 className={cn(
 "flex items-center gap-2 border rounded-lg transition-all",
 compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
 error
 ? "border-red-500 bg-red-500/5"
 : isOpen
 ? "border-blue-primary bg-blue-primary/5 ring-1 ring-brand-500"
 : "border-line-1 bg-bg-page hover:border-blue-primary/50"
 )}
 >
 <Calendar className={cn("text-text-3", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
 <span className={cn(
 "font-medium",
 range?.from && range?.to ? "text-text-1" : "text-text-3"
 )}>
 {displayText}
 </span>
 {daysDiff > 0 && (
 <span className="text-text-3">
 ({daysDiff}d)
 </span>
 )}
 </button>

 {createPortal(dropdownContent, document.body)}
 </div>
 );
};
