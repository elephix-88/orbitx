import { ReactNode } from 'react';
import { Sidebar, type SidebarSection } from '@/components/layout/Sidebar';
import { Topbar, type BreadcrumbItem } from '@/components/layout/Topbar';
import { cn } from '@/lib/utils';

export interface LayoutProps {
 children: ReactNode;
 sections?: SidebarSection[];
 breadcrumbs?: BreadcrumbItem[];
 title?: ReactNode;
 primaryAction?: ReactNode;
 notificationsCount?: number;
 contained?: boolean;
 /** Remove page padding — for full-bleed pages like the builder */
 noPadding?: boolean;
}

const Layout = ({
 children,
 sections,
 breadcrumbs,
 title,
 primaryAction,
 notificationsCount,
 contained = true,
 noPadding = false,
}: LayoutProps) => {
 return (
 <div className={cn('flex bg-bg-page text-text-1', noPadding ? 'h-screen overflow-hidden' : 'min-h-screen')}>
 <Sidebar sections={sections} />
 <div className={cn('flex-1 flex flex-col min-w-0', noPadding && 'overflow-hidden')}>
 <Topbar
 breadcrumbs={breadcrumbs}
 title={title}
 primaryAction={primaryAction}
 notificationsCount={notificationsCount}
 />
 <main className={cn('flex-1', noPadding ? 'overflow-hidden flex flex-col' : 'overflow-x-hidden')}>
 {noPadding ? (
 children
 ) : (
 <div
 className={cn(
 'px-6 py-6 lg:px-8 lg:py-8',
 contained && 'max-w-[1440px] mx-auto'
 )}
 >
 {children}
 </div>
 )}
 </main>
 </div>
 </div>
 );
};

export default Layout;
