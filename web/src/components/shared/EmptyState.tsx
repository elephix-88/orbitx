import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
 icon?: React.ReactNode;
 title: string;
 description?: React.ReactNode;
 action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
 icon,
 title,
 description,
 action,
 className,
 ...props
}) => (
 <div
 className={cn(
 'flex flex-col items-center justify-center text-center px-6 py-10',
 className
 )}
 {...props}
 >
 {icon && (
 <div className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-muted text-text-3 mb-3">
 {icon}
 </div>
 )}
 <div className="text-[14px] font-semibold text-text-1">{title}</div>
 {description && (
 <div className="text-[12.5px] text-text-3 mt-1 max-w-sm">{description}</div>
 )}
 {action && <div className="mt-4">{action}</div>}
 </div>
);

EmptyState.displayName = 'EmptyState';

export default EmptyState;
