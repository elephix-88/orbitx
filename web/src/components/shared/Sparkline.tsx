import React from 'react';
import { cn } from '@/lib/utils';

export type SparkStatus = 'success' | 'warning' | 'danger' | 'blue' | 'muted';

export interface SparkPoint {
 status: SparkStatus;
 /** Normalized 0..1 */
 height: number;
}

export interface SparklineProps extends React.HTMLAttributes<HTMLSpanElement> {
 points: SparkPoint[];
}

const MAX_HEIGHT_PX = 18;

const colorClass: Record<SparkStatus, string> = {
 success: 'bg-success',
 warning: 'bg-warning',
 danger: 'bg-danger',
 blue: 'bg-blue-primary',
 muted: 'bg-text-4',
};

export const Sparkline = React.forwardRef<HTMLSpanElement, SparklineProps>(
 ({ className, points, ...props }, ref) => (
 <span
 ref={ref}
 className={cn('inline-flex items-end gap-[2px] h-[18px] align-middle', className)}
 {...props}
 >
 {points.map((point, index) => {
 const clamped = Math.max(0, Math.min(1, point.height));
 const heightPx = Math.max(1, Math.round(clamped * MAX_HEIGHT_PX));
 return (
 <i
 key={index}
 className={cn('inline-block w-[4px] rounded-[2px]', colorClass[point.status])}
 style={{ height: `${heightPx}px` }}
 />
 );
 })}
 </span>
 )
);

Sparkline.displayName = 'Sparkline';

export default Sparkline;
