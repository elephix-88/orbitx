import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
 Home,
 Workflow,
 Network,
 Clock,
 Link as LinkIcon,
 Database,
 Sparkles,
 Bell,
 FileText,
 Settings,
 LogOut,
 Menu,
 X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Chip } from '@/components/shared/Chip';
import { Avatar } from '@/components/shared/Avatar';

export interface SidebarNavItem {
 id: string;
 label: string;
 path: string;
 icon: React.ReactNode;
 count?: number;
 badge?: React.ReactNode;
 disabled?: boolean;
}

export interface SidebarSection {
 id: string;
 title: string;
 items: SidebarNavItem[];
}

export interface SidebarProps {
 sections?: SidebarSection[];
 workspaceLabel?: string;
 workspacePlan?: string;
}

const defaultSections: SidebarSection[] = [
 {
 id: 'workspace',
 title: 'Workspace',
 items: [
 { id: 'home', label: 'Home', path: '/dashboard', icon: <Home size={16} /> },
 {
 id: 'pipelines',
 label: 'Pipelines',
 path: '/workflows',
 icon: <Workflow size={16} />,
 },
 {
 id: 'builder',
 label: 'Builder',
 path: '/workflows/builder',
 icon: <Network size={16} />,
 },
 {
 id: 'runs',
 label: 'Run History',
 path: '/runs',
 icon: <Clock size={16} />,
 disabled: true,
 },
 ],
 },
 {
 id: 'connect',
 title: 'Connect',
 items: [
 {
 id: 'connections',
 label: 'Connections',
 path: '/connections',
 icon: <LinkIcon size={16} />,
 },
 {
 id: 'destinations',
 label: 'Destinations',
 path: '/destinations',
 icon: <Database size={16} />,
 disabled: true,
 },
 ],
 },
 {
 id: 'intelligence',
 title: 'Intelligence',
 items: [
 {
 id: 'insights',
 label: 'Insights',
 path: '/insights',
 icon: <Sparkles size={16} />,
 badge: (
 <Chip variant="violet" className="ml-auto px-1.5 py-0 text-[10px]">
 AI
 </Chip>
 ),
 disabled: true,
 },
 {
 id: 'alerts',
 label: 'Alerts',
 path: '/alerts',
 icon: <Bell size={16} />,
 disabled: true,
 },
 {
 id: 'reports',
 label: 'Reports',
 path: '/reports',
 icon: <FileText size={16} />,
 disabled: true,
 },
 ],
 },
];

const isActivePath = (pathname: string, itemPath: string): boolean => {
 if (itemPath === '/dashboard') {
 return pathname === '/dashboard' || pathname === '/';
 }
 return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

const NavRow: React.FC<{
 item: SidebarNavItem;
 active: boolean;
 onClick?: () => void;
}> = ({ item, active, onClick }) => {
 const content = (
 <>
 <span
 className={cn(
 'shrink-0 flex items-center justify-center',
 active ? 'text-blue-primary' : 'text-text-3'
 )}
 >
 {item.icon}
 </span>
 <span className="truncate flex-1">{item.label}</span>
 {typeof item.count === 'number' && (
 <span
 className={cn(
 'font-mono text-[11px] px-[6px] py-[1px] rounded-full',
 active
 ? 'bg-bg-card text-blue-primary border border-blue-border'
 : 'bg-bg-muted text-text-3'
 )}
 >
 {item.count}
 </span>
 )}
 {item.badge}
 </>
 );

 const baseClass = cn(
 'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors',
 active
 ? 'bg-blue-soft text-blue-primary font-semibold'
 : 'text-text-2 hover:bg-bg-row-hv hover:text-text-1',
 item.disabled && 'opacity-60 cursor-not-allowed pointer-events-none'
 );

 if (item.disabled) {
 return (
 <span className={baseClass} aria-disabled="true">
 {content}
 </span>
 );
 }

 return (
 <Link to={item.path} className={baseClass} onClick={onClick}>
 {content}
 </Link>
 );
};

export const Sidebar: React.FC<SidebarProps> = ({
 sections = defaultSections,
 workspaceLabel = 'OrbitX',
 workspacePlan,
}) => {
 const location = useLocation();
 const navigate = useNavigate();
 const { user, logout } = useAuthStore();
 const [mobileOpen, setMobileOpen] = useState(false);

 useEffect(() => {
 setMobileOpen(false);
 }, [location.pathname]);

 const onLogout = () => {
 logout();
 navigate('/login');
 };

 const drawer = (
 <div className="flex flex-col h-full bg-bg-card border-r border-line-1 w-[240px]">
 <div className="p-4 flex items-center gap-2">
 <Link
 to="/dashboard"
 className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
 style={{ background: 'var(--navy)' }}
 aria-label="OrbitX home"
 >
 <svg
 className="w-4 h-4 text-white"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2.4"
 aria-hidden="true"
 >
 <circle cx="12" cy="12" r="3" />
 <path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8L7 17M17 7l2.8-2.8" />
 </svg>
 </Link>
 <div className="min-w-0">
 <div className="font-display text-[15px] leading-tight text-text-1 truncate">
 {workspaceLabel}
 </div>
 {workspacePlan && (
 <div className="text-[10.5px] text-text-3 leading-tight truncate">
 {workspacePlan}
 </div>
 )}
 </div>
 </div>

 <nav className="px-3 flex-1 overflow-auto" aria-label="Main navigation">
 {sections.map((section) => (
 <div key={section.id} className="mb-3">
 <div className="section-title px-2 mb-1 mt-2 text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em]">
 {section.title}
 </div>
 <div className="flex flex-col gap-[2px]">
 {section.items.map((item) => (
 <NavRow
 key={item.id}
 item={item}
 active={isActivePath(location.pathname, item.path)}
 />
 ))}
 </div>
 </div>
 ))}
 </nav>

 <div className="p-3 border-t border-line-1">
 <NavRow
 item={{
 id: 'settings',
 label: 'Settings',
 path: '/settings',
 icon: <Settings size={16} />,
 }}
 active={isActivePath(location.pathname, '/settings')}
 />
 {user && (
 <div className="mt-3 flex items-center gap-2.5 px-2 py-2 rounded-lg">
 {user.picture ? (
 <img
 src={user.picture}
 alt={user.name}
 className="w-7 h-7 rounded-full border border-line-1 shrink-0"
 />
 ) : (
 <Avatar name={user.name ?? user.email ?? '?'} size="sm" />
 )}
 <div className="min-w-0 flex-1">
 <div className="text-[12.5px] font-medium text-text-1 truncate">
 {user.name}
 </div>
 <div className="text-[11px] text-text-3 truncate">{user.email}</div>
 </div>
 <button
 type="button"
 onClick={onLogout}
 className="text-text-3 hover:text-danger transition-colors p-1 rounded-md"
 aria-label="Log out"
 title="Log out"
 >
 <LogOut size={15} />
 </button>
 </div>
 )}
 </div>
 </div>
 );

 return (
 <>
 <button
 type="button"
 onClick={() => setMobileOpen((open) => !open)}
 className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-bg-card border border-line-1 text-text-1 shadow-sm"
 aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
 >
 {mobileOpen ? <X size={16} /> : <Menu size={16} />}
 </button>

 <aside className="hidden lg:flex shrink-0 sticky top-0 self-start h-screen">
 {drawer}
 </aside>

 {mobileOpen && (
 <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
 <div
 className="absolute inset-0 bg-text-1/30"
 onClick={() => setMobileOpen(false)}
 aria-hidden="true"
 />
 <div className="relative z-10 h-full shadow-lg animate-slide-up">{drawer}</div>
 </div>
 )}
 </>
 );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;
