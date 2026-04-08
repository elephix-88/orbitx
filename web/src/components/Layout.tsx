import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GitBranch, Link2, Settings, LogOut, Zap } from 'lucide-react';
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

  const navigation: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={16} strokeWidth={1.5} /> },
    { name: 'Workflows', path: '/workflows', icon: <GitBranch size={16} strokeWidth={1.5} /> },
    { name: 'Connections', path: '/connections', icon: <Link2 size={16} strokeWidth={1.5} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={16} strokeWidth={1.5} /> },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'rgb(13, 13, 16)' }}>
      {/* Sidebar - 216px per spec */}
      <aside
        className="fixed top-0 bottom-0 left-0 z-40 flex flex-col w-[216px]"
        style={{ 
          backgroundColor: 'rgb(13, 13, 16)',
          borderRight: '1px solid rgba(255, 255, 255, 0.055)'
        }}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div 
              className="w-7 h-7 flex items-center justify-center rounded-md"
              style={{ backgroundColor: '#FACC15' }}
            >
              <Zap size={14} className="text-[#0D0D10]" strokeWidth={2.5} />
            </div>
            <span 
              className="text-[15px] font-semibold tracking-tight"
              style={{ color: 'rgba(255, 255, 255, 0.88)' }}
            >
              OrbitX
            </span>
          </Link>
        </div>

        {/* 8px gap below logo per spec */}
        <div className="h-2" />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navigation.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150",
                  active
                    ? "text-primary-content"
                    : "hover:text-secondary-content"
                )}
                style={{
                  color: active ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.28)',
                  backgroundColor: active ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.50)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.28)';
                  }
                }}
              >
                {/* Active indicator - 2px left border in brand yellow */}
                {active && (
                  <div 
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                    style={{ backgroundColor: '#FACC15' }}
                  />
                )}
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-[13px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div 
          className="px-3 py-3"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.055)' }}
        >
          {user && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: 'rgba(255, 255, 255, 0.50)'
                  }}
                >
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    (user.name || 'U').slice(0, 3).toUpperCase()
                  )}
                </div>
                <span 
                  className="text-[13px]"
                  style={{ color: 'rgba(255, 255, 255, 0.50)' }}
                >
                  {(user.name || 'User').slice(0, 3).toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="p-1.5 rounded-md transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100"
                style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.50)';
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.28)';
                  e.currentTarget.style.opacity = '0';
                }}
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area - flex-1, scrollable */}
      <main 
        className="flex-1 ml-[216px] min-h-screen overflow-x-hidden"
        style={{ backgroundColor: 'rgb(13, 13, 16)' }}
      >
        {/* Inner container: max-width 1180px, padding 32px horizontal, 36px top per spec */}
        <div className="max-w-[1180px] mx-auto px-8 py-9">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
