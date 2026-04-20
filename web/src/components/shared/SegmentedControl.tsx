import React from 'react';
import { cn } from '@/lib/utils';

export interface SegOption<T extends string> {
 value: T;
 label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
 options: SegOption<T>[];
 value: T;
 onChange: (value: T) => void;
 size?: 'sm' | 'md';
 className?: string;
 ariaLabel?: string;
}

const buttonSize: Record<NonNullable<SegmentedControlProps<string>['size']>, string> = {
 sm: 'text-[11.5px] px-[8px] py-[3px]',
 md: 'text-[12px] px-[10px] py-[4px]',
};

export function SegmentedControl<T extends string>({
 options,
 value,
 onChange,
 size = 'md',
 className,
 ariaLabel,
}: SegmentedControlProps<T>) {
 return (
 <div
 role="radiogroup"
 aria-label={ariaLabel}
 className={cn(
 'inline-flex bg-bg-muted p-[2px] rounded-[8px] border border-line-1 gap-[2px]',
 className
 )}
 >
 {options.map((option) => {
 const active = option.value === value;
 return (
 <button
 key={option.value}
 type="button"
 role="radio"
 aria-checked={active}
 onClick={() => onChange(option.value)}
 className={cn(
 'rounded-[6px] font-medium transition-colors',
 buttonSize[size],
 active ? 'bg-bg-card text-text-1 shadow-sm' : 'text-text-2 hover:text-text-1'
 )}
 >
 {option.label}
 </button>
 );
 })}
 </div>
 );
}

SegmentedControl.displayName = 'SegmentedControl';

export default SegmentedControl;
