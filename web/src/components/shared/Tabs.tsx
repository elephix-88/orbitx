import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
 id: string;
 label: React.ReactNode;
 count?: number;
 badge?: React.ReactNode;
}

export interface TabsProps {
 items: TabItem[];
 activeId: string;
 onChange: (id: string) => void;
 trailingAction?: React.ReactNode;
 className?: string;
 ariaLabel?: string;
}

export const Tabs: React.FC<TabsProps> = ({
 items,
 activeId,
 onChange,
 trailingAction,
 className,
 ariaLabel,
}) => (
 <div
 role="tablist"
 aria-label={ariaLabel}
 className={cn(
 'flex items-end gap-6 border-b border-line-1',
 className
 )}
 >
 {items.map((item) => {
 const active = item.id === activeId;
 return (
 <button
 key={item.id}
 type="button"
 role="tab"
 aria-selected={active}
 onClick={() => onChange(item.id)}
 className={cn(
 'py-2 px-[2px] text-[13px] border-b-2 -mb-[1px] font-medium inline-flex items-center gap-1.5 transition-colors',
 active
 ? 'text-text-1 border-blue-primary font-semibold'
 : 'text-text-3 border-transparent hover:text-text-1'
 )}
 >
 <span>{item.label}</span>
 {typeof item.count === 'number' && (
 <span
 className={cn(
 'font-mono text-[11.5px] px-1 rounded',
 active ? 'text-text-2' : 'text-text-3'
 )}
 >
 {item.count}
 </span>
 )}
 {item.badge}
 </button>
 );
 })}
 {trailingAction && <div className="ml-auto pb-2">{trailingAction}</div>}
 </div>
);

Tabs.displayName = 'Tabs';

export default Tabs;
