import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
 label: string;
 href?: string;
}

export interface TopbarProps {
 breadcrumbs?: BreadcrumbItem[];
 title?: React.ReactNode;
 primaryAction?: React.ReactNode;
 notificationsCount?: number;
 onFeedbackClick?: () => void;
 className?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
 breadcrumbs,
 title,
 primaryAction,
 notificationsCount,
 onFeedbackClick,
 className,
}) => (
 <header
 className={cn(
 'sticky top-0 z-30 flex items-center gap-4 h-[52px] px-6 bg-bg-card border-b border-line-1',
 className
 )}
 >
 <div className="min-w-0 flex-1 flex items-center gap-2">
 {breadcrumbs && breadcrumbs.length > 0 ? (
 <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
 {breadcrumbs.map((crumb, index) => {
 const last = index === breadcrumbs.length - 1;
 return (
 <React.Fragment key={`${crumb.label}-${index}`}>
 {crumb.href && !last ? (
 <Link
 to={crumb.href}
 className="text-text-3 hover:text-text-1 transition-colors"
 >
 {crumb.label}
 </Link>
 ) : (
 <span
 className={cn(
 last ? 'text-text-1 font-semibold' : 'text-text-3'
 )}
 >
 {crumb.label}
 </span>
 )}
 {!last && <span className="text-text-4">/</span>}
 </React.Fragment>
 );
 })}
 </nav>
 ) : (
 title && (
 <div className="text-[15px] font-semibold text-text-1 truncate">{title}</div>
 )
 )}
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 className="relative w-9 h-9 flex items-center justify-center rounded-lg text-text-2 hover:bg-bg-row-hv hover:text-text-1 transition-colors"
 aria-label={`Notifications${notificationsCount ? ` (${notificationsCount})` : ''}`}
 >
 <Bell size={16} aria-hidden="true" />
 {typeof notificationsCount === 'number' && notificationsCount > 0 && (
 <span
 className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-[3px] rounded-full bg-danger text-white text-[9px] font-semibold flex items-center justify-center"
 aria-hidden="true"
 >
 {notificationsCount > 99 ? '99+' : notificationsCount}
 </span>
 )}
 </button>

 <button
 type="button"
 onClick={onFeedbackClick}
 className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium text-text-2 hover:bg-bg-row-hv hover:text-text-1 transition-colors"
 >
 <MessageSquare size={14} aria-hidden="true" />
 Feedback
 </button>

 {primaryAction && <div className="ml-1">{primaryAction}</div>}
 </div>
 </header>
);

Topbar.displayName = 'Topbar';

export default Topbar;
