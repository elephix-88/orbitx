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
      return true; // Default to dark for futuristic feel
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
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen overflow-hidden relative" style={{ backgroundColor: '#F1FAEE' }}>
      {/* Solid Bauhaus Background */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundColor: '#F1FAEE' }} />

      {/* Main Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isCollapsed ? "w-20" : "w-72"
        )}
        style={{ backgroundColor: '#1D3557', borderRadius: '0' }}
      >
        {/* Logo Area */}
        <div className={cn(
          "flex items-center h-20 px-6 transition-all duration-300",
          isCollapsed ? "justify-center px-0" : "justify-between"
        )}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        >
          {!isCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: '#E63946', borderRadius: '2px' }}>
                <span className="text-white font-bold text-xl">O</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white tracking-widest uppercase">ORBITX</span>
                <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#F4A261' }}>AUTOMATION</span>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <Link to="/dashboard" className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: '#E63946', borderRadius: '2px' }}>
              <span className="text-white font-bold text-xl">O</span>
            </Link>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-8 px-3 space-y-2 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex items-center gap-4 px-4 py-3 transition-all duration-300 group",
                isActive(item.path)
                  ? "text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5",
                isCollapsed ? "justify-center px-0" : ""
              )}
              style={{
                borderRadius: '2px',
                backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.08)' : undefined,
              }}
            >
              {/* Active Indicator - 4px left bar */}
              {isActive(item.path) && (
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: '#E63946' }} />
              )}

              <div className={cn(
                "transition-transform duration-300",
                isActive(item.path) ? "text-white" : "text-current"
              )}>
                {React.cloneElement(item.icon as React.ReactElement, {
                  width: 24,
                  height: 24,
                  strokeWidth: isActive(item.path) ? 2.5 : 2
                })}
              </div>

              {!isCollapsed && (
                <span className="font-medium text-sm tracking-wider uppercase">{item.name}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        {user && (
          <div className={cn(
            "p-4",
            isCollapsed ? "flex justify-center" : ""
          )}
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            {isCollapsed ? (
              <div
                className="w-10 h-10 flex items-center justify-center cursor-pointer transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}
                title={user.name}
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-10 h-10" style={{ borderRadius: '2px' }} />
                ) : (
                  <User size={20} className="text-white/70" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-10 h-10" style={{ borderRadius: '2px' }} />
                  ) : (
                    <User size={20} className="text-white/70" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setIsDark(!isDark)}
            className={cn(
              "flex items-center gap-3 w-full p-3 text-white/60 hover:text-white hover:bg-white/5 transition-all duration-300",
              isCollapsed ? "justify-center" : ""
            )}
            style={{ borderRadius: '2px' }}
            title="Toggle Theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            {!isCollapsed && <span className="text-sm font-medium tracking-wider uppercase">Theme</span>}
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className={cn(
              "flex items-center gap-3 w-full p-3 transition-all duration-300",
              isCollapsed ? "justify-center" : ""
            )}
            style={{ borderRadius: '2px', color: '#E63946' }}
            title="Logout"
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="text-sm font-medium tracking-wider uppercase">Logout</span>}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex items-center gap-3 w-full p-3 text-white/60 hover:text-white hover:bg-white/5 transition-all duration-300",
              isCollapsed ? "justify-center" : ""
            )}
            style={{ borderRadius: '2px' }}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            {!isCollapsed && <span className="text-sm font-medium tracking-wider uppercase">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 relative z-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isCollapsed ? "ml-20" : "ml-72"
        )}
      >
        <div className="min-h-screen p-4 md:p-8 overflow-x-hidden">
           <div className="h-4" />
           <div>
             {children}
           </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
