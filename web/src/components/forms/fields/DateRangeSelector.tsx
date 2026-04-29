// =============================================================================
// DateRangeSelector - Time Configuration Component
// =============================================================================
// Provides preset date ranges commonly used in ad platform data extraction.

import React from 'react';
import { Select } from '@/components/shared/form/Select';
import { Calendar } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface TimeConfig {
 time_preset: string;
 time_increment?: number;
}

export interface DateRangeSelectorProps {
 /** Current time configuration */
 value: TimeConfig;
 /** Callback when configuration changes */
 onChange: (config: TimeConfig) => void;
 /** Label for the field */
 label?: string;
 /** Whether to show time increment selector */
 showIncrement?: boolean;
 /** Custom preset options (uses defaults if not provided) */
 presetOptions?: Array<{ value: string; label: string }>;
 /** Increment options (uses defaults if not provided) */
 incrementOptions?: Array<{ value: number; label: string }>;
 /** Helper text */
 helperText?: string;
 /** Disabled state */
 disabled?: boolean;
 /** CSS class name */
 className?: string;
}

// =============================================================================
// Default Options
// =============================================================================

export const DEFAULT_DATE_PRESETS = [
 { value: 'today', label: 'Today' },
 { value: 'yesterday', label: 'Yesterday' },
 { value: 'last_7_days', label: 'Last 7 days' },
 { value: 'last_14_days', label: 'Last 14 days' },
 { value: 'last_30_days', label: 'Last 30 days' },
 { value: 'last_60_days', label: 'Last 60 days' },
 { value: 'last_90_days', label: 'Last 90 days' },
 { value: 'this_week', label: 'This week' },
 { value: 'last_week', label: 'Last week' },
 { value: 'this_month', label: 'This month' },
 { value: 'last_month', label: 'Last month' },
 { value: 'this_quarter', label: 'This quarter' },
 { value: 'last_quarter', label: 'Last quarter' },
 { value: 'this_year', label: 'This year' },
 { value: 'last_year', label: 'Last year' },
 { value: 'lifetime', label: 'Lifetime' },
];

export const DEFAULT_INCREMENT_OPTIONS = [
 { value: 1, label: 'Daily' },
 { value: 7, label: 'Weekly' },
 { value: 28, label: 'Every 28 days' },
 { value: 30, label: 'Monthly' },
 { value: 0, label: 'All time (no breakdown)' },
];

// =============================================================================
// Component
// =============================================================================

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
 value,
 onChange,
 label = 'Date Range',
 showIncrement = false,
 presetOptions = DEFAULT_DATE_PRESETS,
 incrementOptions = DEFAULT_INCREMENT_OPTIONS,
 helperText,
 disabled = false,
 className = '',
}) => {
 const handlePresetChange = (preset: string | number) => {
 onChange({
 ...value,
 time_preset: String(preset),
 });
 };

 const handleIncrementChange = (increment: string | number) => {
 onChange({
 ...value,
 time_increment: Number(increment),
 });
 };

 return (
 <div className={`space-y-4 ${className}`}>
 <div className="flex items-center gap-2 mb-2">
 <Calendar className="w-4 h-4 text-text-3" />
 {label && (
 <label className="text-sm font-medium text-text-2">
 {label}
 </label>
 )}
 </div>

 <div className={showIncrement ? 'grid grid-cols-2 gap-4' : ''}>
 <Select
 label="Date Preset"
 value={value.time_preset || 'last_7_days'}
 onChange={handlePresetChange}
 options={presetOptions}
 placeholder="Select date range"
 disabled={disabled}
 />

 {showIncrement && (
 <Select
 label="Time Increment"
 value={value.time_increment ?? 1}
 onChange={handleIncrementChange}
 options={incrementOptions}
 placeholder="Select increment"
 disabled={disabled}
 />
 )}
 </div>

 {helperText && (
 <p className="text-xs text-text-3">{helperText}</p>
 )}
 </div>
 );
};

// =============================================================================
// Utility: Get date range from preset
// =============================================================================

export function getDateRangeFromPreset(preset: string): { start: Date; end: Date } {
 const now = new Date();
 const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 const yesterday = new Date(today);
 yesterday.setDate(yesterday.getDate() - 1);

 switch (preset) {
 case 'today':
 return { start: today, end: today };

 case 'yesterday':
 return { start: yesterday, end: yesterday };

 case 'last_7_days': {
 const start = new Date(today);
 start.setDate(start.getDate() - 6);
 return { start, end: today };
 }

 case 'last_14_days': {
 const start = new Date(today);
 start.setDate(start.getDate() - 13);
 return { start, end: today };
 }

 case 'last_30_days': {
 const start = new Date(today);
 start.setDate(start.getDate() - 29);
 return { start, end: today };
 }

 case 'last_60_days': {
 const start = new Date(today);
 start.setDate(start.getDate() - 59);
 return { start, end: today };
 }

 case 'last_90_days': {
 const start = new Date(today);
 start.setDate(start.getDate() - 89);
 return { start, end: today };
 }

 case 'this_week': {
 const start = new Date(today);
 start.setDate(start.getDate() - start.getDay());
 return { start, end: today };
 }

 case 'last_week': {
 const end = new Date(today);
 end.setDate(end.getDate() - end.getDay() - 1);
 const start = new Date(end);
 start.setDate(start.getDate() - 6);
 return { start, end };
 }

 case 'this_month': {
 const start = new Date(today.getFullYear(), today.getMonth(), 1);
 return { start, end: today };
 }

 case 'last_month': {
 const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
 const end = new Date(today.getFullYear(), today.getMonth(), 0);
 return { start, end };
 }

 case 'this_quarter': {
 const quarter = Math.floor(today.getMonth() / 3);
 const start = new Date(today.getFullYear(), quarter * 3, 1);
 return { start, end: today };
 }

 case 'last_quarter': {
 const quarter = Math.floor(today.getMonth() / 3);
 const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
 const end = new Date(today.getFullYear(), quarter * 3, 0);
 return { start, end };
 }

 case 'this_year': {
 const start = new Date(today.getFullYear(), 0, 1);
 return { start, end: today };
 }

 case 'last_year': {
 const start = new Date(today.getFullYear() - 1, 0, 1);
 const end = new Date(today.getFullYear() - 1, 11, 31);
 return { start, end };
 }

 case 'lifetime':
 default:
 // Return a very old start date for lifetime
 return { start: new Date(2000, 0, 1), end: today };
 }
}

export default DateRangeSelector;
