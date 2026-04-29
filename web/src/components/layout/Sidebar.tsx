import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronLeft,
  ChevronRight,
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
      { id: 'home',      label: 'Home',        path: '/dashboard',         icon: <Home size={15} /> },
      { id: 'pipelines', label: 'Pipelines',   path: '/workflows',         icon: <Workflow size={15} /> },
      { id: 'builder',   label: 'Builder',     path: '/workflows/builder', icon: <Network size={15} /> },
      { id: 'runs',      label: 'Run History', path: '/runs',              icon: <Clock size={15} />, disabled: true },
    ],
  },
  {
    id: 'connect',
    title: 'Connect',
    items: [
      { id: 'connections',  label: 'Connections',  path: '/connections',  icon: <LinkIcon size={15} /> },
      { id: 'destinations', label: 'Destinations', path: '/destinations', icon: <Database size={15} />, disabled: true },
    ],
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    items: [
      {
        id: 'insights', label: 'Insights', path: '/insights', icon: <Sparkles size={15} />,
        badge: <Chip variant="violet" className="ml-auto px-1.5 py-0 text-[10px]">AI</Chip>,
        disabled: true,
      },
      { id: 'alerts',  label: 'Alerts',  path: '/alerts',  icon: <Bell size={15} />,     disabled: true },
      { id: 'reports', label: 'Reports', path: '/reports', icon: <FileText size={15} />, disabled: true },
    ],
  },
];

const isActivePath = (pathname: string, itemPath: string): boolean => {
  if (itemPath === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

/* ─── NavRow ─────────────────────────────────────────────────────── */

const NavRow: React.FC<{
  item: SidebarNavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}> = ({ item, active, collapsed, onClick }) => {
  const baseClass = cn(
    'group/row relative flex items-center rounded-lg text-[13px] font-medium select-none outline-none',
    'transition-colors duration-150',
    collapsed ? 'justify-center w-9 h-9 mx-auto' : 'gap-2.5 px-2.5 py-[7px] w-full',
    active
      ? 'bg-blue-soft'
      : (!item.disabled && 'hover:bg-bg-muted'),
    item.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
  );

  const content = (
    <>
      {/* Left accent bar */}
      <motion.span
        aria-hidden
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-blue-primary"
        animate={{ height: active ? 20 : 0, opacity: active ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Icon */}
      <motion.span
        className={cn(
          'shrink-0 flex items-center justify-center',
          active ? 'text-blue-primary' : 'text-text-3',
          collapsed ? 'mx-auto' : ''
        )}
        whileHover={(!active && !item.disabled) ? { scale: 1.15, x: 1 } : {}}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        {item.icon}
      </motion.span>

      {/* Label */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.13 }}
            className={cn(
              'truncate flex-1',
              active
                ? 'font-semibold text-text-1'
                : 'text-text-2 group-hover/row:text-text-1 transition-colors duration-150'
            )}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Count + badge */}
      <AnimatePresence initial={false}>
        {!collapsed && (typeof item.count === 'number' || item.badge) && (
          <motion.span
            key="meta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.13 }}
            className="shrink-0 flex items-center"
          >
            {typeof item.count === 'number' && (
              <span className={cn(
                'font-mono text-[11px] px-[6px] py-[1px] rounded-full transition-colors',
                active
                  ? 'bg-blue-soft text-blue-primary border border-blue-border'
                  : 'bg-bg-muted text-text-3'
              )}>
                {item.count}
              </span>
            )}
            {item.badge}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  if (item.disabled) {
    return (
      <span className={baseClass} title={item.label} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link
      to={item.path}
      className={baseClass}
      title={collapsed ? item.label : undefined}
      onClick={onClick}
    >
      {content}
    </Link>
  );
};

/* ─── SidebarDrawer ──────────────────────────────────────────────── */

const SidebarDrawer: React.FC<{
  sections: SidebarSection[];
  workspaceLabel: string;
  workspacePlan?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
}> = ({ sections, workspaceLabel, collapsed, onToggleCollapse, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isMobile = Boolean(onClose);

  const onLogout = () => { logout(); navigate('/login'); };

  return (
    /* Wrapper carries the right shadow (outside overflow-hidden) */
    <div className="group/sidebar relative h-full flex z-10 shadow-[2px_0_12px_-4px_rgba(15,23,42,0.08)]">

      {/* ── Main panel ── */}
      <motion.div
        className="flex flex-col h-full bg-bg-card overflow-hidden"
        animate={{ width: collapsed ? 60 : 220 }}
        initial={false}
        transition={{ duration: 0.22 }}
      >

        {/* Logo zone */}
        <div className={cn(
          'flex items-center h-[56px] border-b border-line-1 shrink-0',
          collapsed ? 'justify-center' : 'px-4 gap-2.5'
        )}>
          <Link
            to="/dashboard"
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hover:opacity-85 hover:scale-105 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #1848F3 0%, #6D28D9 100%)' }}
            aria-label="OrbitX home"
            onClick={onClose}
          >
            <span className="text-white font-bold text-sm leading-none select-none">O</span>
          </Link>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="wordmark"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="flex items-center gap-1.5 min-w-0"
              >
                <span className="text-[14px] font-bold text-text-1 tracking-tight leading-none truncate">
                  {workspaceLabel}
                </span>
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-text-4 bg-bg-muted px-1.5 py-[3px] rounded-full border border-line-1 leading-none">
                  Beta
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav
          className={cn('flex-1 overflow-y-auto overflow-x-hidden pt-3', collapsed ? 'px-1.5' : 'px-3')}
          aria-label="Main navigation"
        >
          {sections.map((section, si) => (
            <div key={section.id} className="mb-3">
              {/* Section label / collapsed divider */}
              <AnimatePresence initial={false} mode="wait">
                {!collapsed ? (
                  <motion.p
                    key="title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-4 select-none"
                  >
                    {section.title}
                  </motion.p>
                ) : (si > 0 ? (
                  <motion.div
                    key="divider"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="h-px bg-line-1 mx-1 mb-2"
                  />
                ) : null)}
              </AnimatePresence>

              <div className={cn('flex flex-col', collapsed ? 'gap-1 items-center' : 'gap-[2px]')}>
                {section.items.map((item) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    active={isActivePath(location.pathname, item.path)}
                    collapsed={collapsed}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom zone */}
        <div className={cn(
          'shrink-0 border-t border-line-1',
          collapsed ? 'px-1.5 pt-3 pb-4' : 'px-3 pt-3 pb-4'
        )}>
          <div className={cn(collapsed ? 'flex flex-col items-center gap-1 mb-2' : 'mb-2')}>
            <NavRow
              item={{ id: 'settings', label: 'Settings', path: '/settings', icon: <Settings size={15} /> }}
              active={isActivePath(location.pathname, '/settings')}
              collapsed={collapsed}
              onClick={onClose}
            />
          </div>

          {/* User row */}
          <AnimatePresence initial={false} mode="wait">
            {user && !collapsed && (
              <motion.div
                key="user-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="group/user flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-bg-muted transition-colors cursor-default"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name ?? ''}
                    className="w-6 h-6 rounded-full shrink-0 border border-line-1"
                  />
                ) : (
                  <Avatar name={user.name ?? user.email ?? '?'} size="sm" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-text-1 truncate leading-tight">{user.name}</div>
                  <div className="text-[10.5px] text-text-3 truncate leading-tight">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="shrink-0 p-1 rounded-md text-text-4 hover:text-danger transition-colors cursor-pointer opacity-0 group-hover/user:opacity-100"
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut size={13} />
                </button>
              </motion.div>
            )}

            {user && collapsed && (
              <motion.div
                key="user-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex justify-center mt-1"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name ?? ''}
                    title={user.name ?? user.email ?? ''}
                    className="w-7 h-7 rounded-full border border-line-1 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <Avatar name={user.name ?? user.email ?? '?'} size="sm" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Floating edge toggle (desktop only) ── */}
      {!isMobile && (
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -right-[13px] z-20',
            'w-[26px] h-[26px] rounded-full bg-bg-card border border-line-1 shadow-md',
            'flex items-center justify-center',
            'text-text-3 hover:text-blue-primary hover:border-blue-border hover:shadow-lg',
            'transition-all duration-150 cursor-pointer',
            'opacity-0 group-hover/sidebar:opacity-100',
          )}
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      )}
    </div>
  );
};

/* ─── Sidebar shell ──────────────────────────────────────────────── */

export const Sidebar: React.FC<SidebarProps> = ({
  sections = defaultSections,
  workspaceLabel = 'OrbitX',
  workspacePlan,
}) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-bg-card border border-line-1 text-text-2 shadow-sm cursor-pointer"
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Desktop */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 self-start h-screen">
        <SidebarDrawer
          sections={sections}
          workspaceLabel={workspaceLabel}
          workspacePlan={workspacePlan}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* Mobile overlay with slide + fade animation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              className="relative z-10 h-full shadow-2xl"
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ duration: 0.22 }}
            >
              <SidebarDrawer
                sections={sections}
                workspaceLabel={workspaceLabel}
                workspacePlan={workspacePlan}
                collapsed={false}
                onToggleCollapse={() => {}}
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

Sidebar.displayName = 'Sidebar';
export default Sidebar;
