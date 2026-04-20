import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchShell } from './SearchShell';
import { SegmentedControl, type SegOption } from './SegmentedControl';

export interface FilterPill {
 label: string;
 value: string;
 options?: string[];
 onSelect: (value: string) => void;
}

export interface FilterBarProps {
 search: {
 placeholder: string;
 value: string;
 onChange: (value: string) => void;
 };
 filters: FilterPill[];
 groupBy?: {
 options: SegOption<string>[];
 value: string;
 onChange: (value: string) => void;
 };
 viewToggle?: {
 options: SegOption<string>[];
 value: string;
 onChange: (value: string) => void;
 };
 className?: string;
}

const pillButtonClass =
 'inline-flex items-center gap-1.5 px-3 py-[6px] bg-bg-card border border-line-1 text-text-2 rounded-[8px] text-[12.5px] font-medium hover:border-line-2 transition-colors';

export const FilterBar: React.FC<FilterBarProps> = ({
 search,
 filters,
 groupBy,
 viewToggle,
 className,
}) => (
 <div className={cn('flex items-center gap-2 flex-wrap', className)}>
 <SearchShell
 placeholder={search.placeholder}
 value={search.value}
 onChange={search.onChange}
 width="lg"
 />
 {filters.map((filter) => (
 <button
 key={filter.label}
 type="button"
 onClick={() => {
 if (filter.options && filter.options.length > 0) {
 const next =
 filter.options[
 (filter.options.indexOf(filter.value) + 1) % filter.options.length
 ];
 filter.onSelect(next);
 }
 }}
 className={pillButtonClass}
 >
 <span className="text-text-3">{filter.label}:</span>
 <span className="text-text-1">{filter.value}</span>
 <ChevronDown className="w-3 h-3 text-text-3" aria-hidden="true" />
 </button>
 ))}
 {groupBy && (
 <div className="ml-auto flex items-center gap-2">
 <span className="text-[11.5px] font-medium text-text-3 uppercase tracking-wider">
 Group
 </span>
 <SegmentedControl<string>
 options={groupBy.options}
 value={groupBy.value}
 onChange={groupBy.onChange}
 size="sm"
 />
 </div>
 )}
 {viewToggle && (
 <SegmentedControl<string>
 options={viewToggle.options}
 value={viewToggle.value}
 onChange={viewToggle.onChange}
 size="sm"
 className={groupBy ? '' : 'ml-auto'}
 />
 )}
 </div>
);

FilterBar.displayName = 'FilterBar';

export default FilterBar;
