import React from 'react';
import { cn } from '@/lib/utils';

export interface StatTileDelta {
 direction: 'up' | 'down' | 'flat';
 text: string;
}

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
 label: string;
 value: React.ReactNode;
 delta?: StatTileDelta;
 mono?: boolean;
}

const deltaClass: Record<StatTileDelta['direction'], string> = {
 up: 'text-success',
 down: 'text-danger',
 flat: 'text-text-3',
};

const deltaGlyph: Record<StatTileDelta['direction'], string> = {
 up: '▲',
 down: '▼',
 flat: '•',
};

export const StatTile = React.forwardRef<HTMLDivElement, StatTileProps>(
 ({ className, label, value, delta, mono, ...props }, ref) => (
 <div
 ref={ref}
 className={cn(
 'px-4 py-[14px] bg-bg-card border border-line-1 rounded-xl shadow-sm',
 className
 )}
 {...props}
 >
 <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-3">{label}</div>
 <div
 className={cn(
 'font-bold text-[24px] leading-tight mt-[2px] text-text-1 tracking-[-0.01em]',
 mono && 'font-mono'
 )}
 >
 {value}
 </div>
 {delta && (
 <div className={cn('mt-1 text-[11.5px] font-medium', deltaClass[delta.direction])}>
 <span aria-hidden="true" className="mr-1">
 {deltaGlyph[delta.direction]}
 </span>
 {delta.text}
 </div>
 )}
 </div>
 )
);

StatTile.displayName = 'StatTile';

export default StatTile;
