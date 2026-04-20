import React from 'react';
import { cn } from '@/lib/utils';

export interface FlowChipProps extends React.HTMLAttributes<HTMLSpanElement> {
 source: React.ReactNode;
 destination: React.ReactNode;
}

const nodeClass =
 'inline-flex items-center gap-1 px-[6px] py-[2px] bg-bg-muted border border-line-1 rounded-[6px] text-text-2';

export const FlowChip = React.forwardRef<HTMLSpanElement, FlowChipProps>(
 ({ className, source, destination, ...props }, ref) => (
 <span
 ref={ref}
 className={cn(
 'inline-flex items-center gap-1.5 text-[12px] text-text-2',
 className
 )}
 {...props}
 >
 <span className={nodeClass}>{source}</span>
 <svg
 className="w-3 h-3 text-text-4 shrink-0"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 aria-hidden="true"
 >
 <path d="M5 12h14M13 6l6 6-6 6" />
 </svg>
 <span className={nodeClass}>{destination}</span>
 </span>
 )
);

FlowChip.displayName = 'FlowChip';

export default FlowChip;
