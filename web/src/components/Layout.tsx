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
      return true;
    } catch {
      return true;
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
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-surface-primary">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-surface-secondary border-r border-border transition-all duration-300 ease-out",
          isCollapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 border-b border-border transition-all duration-200",
          isCollapsed ? "justify-center px-0" : "px-4"
        )}>
          {!isCollapsed ? (
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-400">
                <span className="text-neutral-950 font-semibold text-sm">O</span>
              </div>
              <span className="text-sm font-semibold text-neutral-50 tracking-tight">OrbitX</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-400">
              <span className="text-neutral-950 font-semibold text-sm">O</span>
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
                "relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 group",
                isActive(item.path)
                  ? "bg-primary-400/10 text-primary-400"
                  : "text-neutral-400 hover:text-neutral-50 hover:bg-neutral-800/50",
                isCollapsed ? "justify-center px-0" : ""
              )}
            >
              {isActive(item.path) && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary-400" />
              )}
              <div className="flex-shrink-0">
                {React.cloneElement(item.icon as React.ReactElement, {
                  width: 18,
                  height: 18,
                  strokeWidth: isActive(item.path) ? 2 : 1.5
                })}
              </div>
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* User */}
        {user && (
          <div className={cn(
            "px-2 py-3 border-t border-border",
            isCollapsed ? "flex justify-center" : ""
          )}>
            {isCollapsed ? (
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800" title={user.name}>
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <User size={14} className="text-neutral-500" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full bg-neutral-800">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <User size={14} className="text-neutral-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-200 truncate">{user.name}</p>
                  <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-2 py-3 space-y-0.5 border-t border-border">
          <button
            onClick={() => setIsDark(!isDark)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors duration-150",
              isCollapsed ? "justify-center px-0" : ""
            )}
            title="Toggle Theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {!isCollapsed && <span className="text-sm">Theme</span>}
          </button>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-neutral-500 hover:text-error hover:bg-error-light/50 transition-colors duration-150",
              isCollapsed ? "justify-center px-0" : ""
            )}
            title="Logout"
          >
            <LogOut size={16} />
            {!isCollapsed && <span className="text-sm">Logout</span>}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors duration-150",
              isCollapsed ? "justify-center px-0" : ""
            )}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!isCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={cn(
        "flex-1 relative z-10 transition-all duration-300 ease-out",
        isCollapsed ? "ml-16" : "ml-56"
      )}>
        <div className="min-h-screen px-8 py-8 overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
