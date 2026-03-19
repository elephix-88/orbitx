import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '@/services/authService';

interface SessionTimeoutResult {
  /** Whether to show the session expiration warning */
  showWarning: boolean;
  /** Minutes remaining until session expires */
  minutesRemaining: number | null;
  /** Dismiss the warning (user chose to ignore) */
  dismissWarning: () => void;
  /** Manually trigger logout */
  logout: () => void;
}

/**
 * Decodes JWT token and extracts expiration time.
 * Returns null if token is invalid or doesn't have exp claim.
 */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.exp !== 'number') return null;

    // exp is in seconds, convert to milliseconds
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/**
 * Hook to monitor session expiration and show warnings.
 *
 * @param warningMinutes - Minutes before expiration to show warning (default: 5)
 * @param checkIntervalMs - How often to check expiration (default: 60000ms = 1 minute)
 */
export const useSessionTimeout = (
  warningMinutes = 5,
  checkIntervalMs = 60000
): SessionTimeoutResult => {
  const [showWarning, setShowWarning] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  // Use ref to avoid effect re-running when callback identity changes
  const warningMinutesRef = useRef(warningMinutes);
  warningMinutesRef.current = warningMinutes;

  const handleLogout = useCallback(() => {
    authService.logout();
    window.location.href = '/login';
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkExpiration = () => {
      if (!isMounted) return;

      const token = authService.getToken();
      if (!token) {
        setShowWarning(false);
        setMinutesRemaining(null);
        return;
      }

      const expiry = getTokenExpiry(token);
      if (!expiry) {
        // Invalid token format, can't determine expiry
        console.warn('Session timeout: Unable to parse token expiry');
        return;
      }

      const now = Date.now();
      const remaining = expiry - now;
      const remainingMinutes = Math.floor(remaining / (60 * 1000));

      setMinutesRemaining(remainingMinutes > 0 ? remainingMinutes : 0);

      if (remaining <= 0) {
        // Token has expired
        authService.logout();
        window.location.href = '/login';
      } else if (remaining < warningMinutesRef.current * 60 * 1000) {
        // Within warning window
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately on mount
    checkExpiration();

    // Set up interval to check periodically
    const interval = setInterval(checkExpiration, checkIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkIntervalMs]);

  return {
    showWarning,
    minutesRemaining,
    dismissWarning,
    logout: handleLogout,
  };
};
