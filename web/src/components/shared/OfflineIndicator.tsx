import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { useOnlineStatus, formatOfflineDuration } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
 className?: string;
}

/**
 * Global offline indicator that shows when the user loses connection
 * and a reconnection banner when they come back online.
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
 const { isOnline, wasOffline, lastOnline, clearWasOffline } = useOnlineStatus();
 const [showReconnected, setShowReconnected] = useState(false);

 // Show reconnected banner when coming back online
 useEffect(() => {
 if (wasOffline && isOnline) {
 setShowReconnected(true);
 // Auto-dismiss after 5 seconds
 const timer = setTimeout(() => {
 setShowReconnected(false);
 clearWasOffline();
 }, 5000);
 return () => clearTimeout(timer);
 }
 }, [wasOffline, isOnline, clearWasOffline]);

 const handleDismissReconnected = () => {
 setShowReconnected(false);
 clearWasOffline();
 };

 // Offline banner
 if (!isOnline) {
 return (
 <div
 className={cn(
 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
 'bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg',
 'flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300',
 className
 )}
 role="alert"
 aria-live="assertive"
 >
 <WifiOff className="w-5 h-5 flex-shrink-0" />
 <div>
 <p className="font-semibold text-sm">You're offline</p>
 <p className="text-xs text-red-100">
 Some features may be unavailable. Last online {formatOfflineDuration(lastOnline)}
 </p>
 </div>
 </div>
 );
 }

 // Reconnected banner
 if (showReconnected) {
 return (
 <div
 className={cn(
 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
 'bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg',
 'flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300',
 className
 )}
 role="status"
 aria-live="polite"
 >
 <Wifi className="w-5 h-5 flex-shrink-0" />
 <div>
 <p className="font-semibold text-sm">Back online</p>
 <p className="text-xs text-green-100">Your connection has been restored</p>
 </div>
 <button
 onClick={handleDismissReconnected}
 className="p-1 hover:bg-green-500 rounded-lg transition-colors ml-2"
 aria-label="Dismiss"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 );
 }

 return null;
};

/**
 * Small inline status indicator for headers/toolbars
 */
export const OnlineStatusBadge: React.FC<{ className?: string }> = ({ className }) => {
 const { isOnline } = useOnlineStatus();

 return (
 <div
 className={cn(
 'flex items-center gap-1.5 text-xs',
 isOnline ? 'text-green-600 ' : 'text-red-600 ',
 className
 )}
 title={isOnline ? 'Connected' : 'Offline'}
 >
 <span
 className={cn(
 'w-2 h-2 rounded-full',
 isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'
 )}
 />
 <span className="sr-only">{isOnline ? 'Online' : 'Offline'}</span>
 </div>
 );
};
