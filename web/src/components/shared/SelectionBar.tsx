import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectionAction {
 label: React.ReactNode;
 onClick: () => void;
 destructive?: boolean;
}

export interface SelectionBarProps extends React.HTMLAttributes<HTMLDivElement> {
 count: number;
 actions: SelectionAction[];
 onClear: () => void;
}

export const SelectionBar = React.forwardRef<HTMLDivElement, SelectionBarProps>(
 ({ className, count, actions, onClear, ...props }, ref) => {
 if (count <= 0) return null;

 return (
 <div
 ref={ref}
 role="toolbar"
 aria-label={`${count} selected`}
 className={cn(
 'flex items-center gap-3 px-4 py-2 bg-blue-soft border border-blue-border rounded-[10px] text-[13px]',
 className
 )}
 {...props}
 >
 <span className="font-semibold text-blue-primary">{count} selected</span>
 <div className="h-4 w-px bg-blue-border" />
 <div className="flex items-center gap-1">
 {actions.map((action, index) => (
 <button
 key={index}
 type="button"
 onClick={action.onClick}
 className={cn(
 'px-2 py-1 rounded-[6px] text-[13px] font-medium transition-colors',
 action.destructive
 ? 'text-danger hover:bg-danger-bg'
 : 'text-text-2 hover:bg-bg-card'
 )}
 >
 {action.label}
 </button>
 ))}
 </div>
 <button
 type="button"
 onClick={onClear}
 className="ml-auto text-[12px] text-text-3 hover:text-text-1 transition-colors"
 >
 Clear
 </button>
 </div>
 );
 }
);

SelectionBar.displayName = 'SelectionBar';

export default SelectionBar;
