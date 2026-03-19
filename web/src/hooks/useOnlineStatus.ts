import { useState, useEffect, useCallback } from 'react';

interface OnlineStatusState {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
}

/**
 * Hook to track online/offline status
 *
 * @example
 * ```tsx
 * const { isOnline, wasOffline } = useOnlineStatus();
 *
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 *
 * if (wasOffline) {
 *   return <ReconnectedBanner onDismiss={clearWasOffline} />;
 * }
 * ```
 */
export function useOnlineStatus() {
  const [state, setState] = useState<OnlineStatusState>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnline: new Date(),
  }));

  const handleOnline = useCallback(() => {
    setState((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline, // Only set wasOffline if we were actually offline
      lastOnline: new Date(),
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: false,
    }));
  }, []);

  const clearWasOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      wasOffline: false,
    }));
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    ...state,
    clearWasOffline,
  };
}

/**
 * Format time since last online
 */
export function formatOfflineDuration(lastOnline: Date | null): string {
  if (!lastOnline) return '';

  const now = new Date();
  const diffMs = now.getTime() - lastOnline.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
}
