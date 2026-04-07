import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, initialize } = useAuthStore();

  // Skip the loading spinner if the user is already in the store
  const [isInitialized, setIsInitialized] = useState(!!user);

  useEffect(() => {
    if (isInitialized) return;

    let isMounted = true;

    const init = async () => {
      await initialize();
      if (isMounted) {
        setIsInitialized(true);
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, [initialize, isInitialized]);

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

