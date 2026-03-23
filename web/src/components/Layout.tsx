import React, { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, WorkflowIcon, ConnectionIcon } from './icons';
import { Moon, Sun, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';


interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme-dark');
      if (saved !== null) return JSON.parse(saved);
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme-dark', JSON.stringify(isDark));
    } catch {}
  }, [isDark]);

  const navigation: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: <HomeIcon /> },
    { name: 'Workflows', path: '/workflows', icon: <WorkflowIcon /> },
    { name: 'Connections', path: '/connections', icon: <ConnectionIcon /> },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-surface-primary">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-surface-primary border-r border-border transition-all duration-300 ease-out",
          isCollapsed ? "w-14" : "w-60"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 border-b border-border transition-all duration-200",
          isCollapsed ? "justify-center px-0" : "px-4"
        )}>
          {!isCollapsed ? (
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-600">
                <span className="text-white font-semibold text-sm">O</span>
              </div>
              <span className="text-base font-semibold text-text-primary tracking-tight">OrbitX</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-600">
              <span className="text-white font-semibold text-sm">O</span>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex items-center gap-3 px-2.5 py-2 rounded-md transition-colors duration-150 group",
                isActive(item.path)
                  ? "bg-primary-50 text-primary-600 dark:bg-primary-600/10 dark:text-primary-400"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-tertiary",
                isCollapsed ? "justify-center px-0" : ""
              )}
            >
              {/* Active indicator */}
              {isActive(item.path) && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary-600 dark:bg-primary-400" />
              )}

              <div className="flex-shrink-0">
                {React.cloneElement(item.icon as React.ReactElement, {
                  width: 20,
                  height: 20,
                  strokeWidth: isActive(item.path) ? 2 : 1.5
                })}
              </div>

              {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        {user && (
          <div className={cn(
            "px-2 py-3 border-t border-border",
            isCollapsed ? "flex justify-center" : ""
          )}>
            {isCollapsed ? (
              <div
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-tertiary cursor-pointer"
                title={user.name}
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <User size={16} className="text-text-tertiary" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full bg-surface-tertiary">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <User size={16} className="text-text-tertiary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                  <p className="text-xs text-text-tertiary truncate">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-2 py-3 space-y-0.5 border-t border-border">
          <button
            onClick={() => setIsDark(!isDark)}
            className={cn(
              "flex items-center gap-3 w-full px-2.5 py-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors duration-150",
              isCollapsed ? "justify-center px-0" : ""
            )}
            title="Toggle Theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {!isCollapsed && <span className="text-sm font-medium">Theme</span>}
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className={cn(
              "flex items-center gap-3 w-full px-2.5 py-2 rounded-md text-text-secondary hover:text-error hover:bg-error-light transition-colors duration-150",
              isCollapsed ? "justify-center px-0" : ""
            )}
            title="Logout"
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex items-center gap-3 w-full px-2.5 py-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors duration-150",
              isCollapsed ? "justify-center px-0" : ""
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isCollapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 relative z-10 transition-all duration-300 ease-out",
          isCollapsed ? "ml-14" : "ml-60"
        )}
      >
        <div className="min-h-screen px-6 py-6 md:px-8 md:py-8 overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
