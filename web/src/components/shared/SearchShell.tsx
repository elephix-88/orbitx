import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchShellProps
 extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'width'> {
 placeholder: string;
 value?: string;
 onChange?: (value: string) => void;
 kbdHint?: string;
 width?: 'full' | 'md' | 'lg';
}

const widthClass: Record<NonNullable<SearchShellProps['width']>, string> = {
 full: 'w-full',
 md: 'w-[240px]',
 lg: 'w-[320px]',
};

export const SearchShell = React.forwardRef<HTMLInputElement, SearchShellProps>(
 (
 { className, placeholder, value, onChange, kbdHint, width = 'lg', ...rest },
 ref
 ) => (
 <label
 className={cn(
 'inline-flex items-center gap-2 px-[10px] py-[6px] bg-bg-muted border border-line-1 rounded-[8px] text-[13px] text-text-3 focus-within:border-blue-border focus-within:bg-bg-card transition-colors',
 widthClass[width],
 className
 )}
 >
 <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
 <input
 ref={ref}
 type="search"
 placeholder={placeholder}
 value={value}
 onChange={(event) => onChange?.(event.target.value)}
 className="flex-1 bg-transparent outline-none border-none p-0 text-text-1 placeholder:text-text-3 min-w-0"
 {...rest}
 />
 {kbdHint && (
 <kbd className="font-mono text-[10.5px] bg-bg-card border border-line-1 rounded-[4px] px-[5px] py-[1px] text-text-3">
 {kbdHint}
 </kbd>
 )}
 </label>
 )
);

SearchShell.displayName = 'SearchShell';

export default SearchShell;
