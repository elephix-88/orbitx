import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MoreVertical, Trash2, Eye, ExternalLink, RefreshCw, Clock } from 'lucide-react';

export type ConnectionRowVariant = 'connected' | 'available';

type ConnectionRowProps = {
  icon: React.ReactNode;
  name: string;
  description?: string;
  variant: ConnectionRowVariant;
  status?: string;
  accountInfo?: string;
  lastSynced?: string;
  onConnect?: () => void;
  onViewDetails?: () => void;
  onDisconnect?: () => void;
  isConnecting?: boolean;
};

type StatusConfig = { label: string; dotClass: string; textClass: string };

const statusConfig: Record<string, StatusConfig> = {
  connected: {
    label: 'Connected',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  active: {
    label: 'Connected',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  inactive: {
    label: 'Inactive',
    dotClass: 'bg-neutral-400',
    textClass: 'text-text-secondary',
  },
  paused: {
    label: 'Paused',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
  },
  syncing: {
    label: 'Syncing',
    dotClass: 'bg-blue-500 animate-pulse',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
};

const defaultStatusConfig: StatusConfig = {
  label: 'Connected',
  dotClass: 'bg-emerald-500',
  textClass: 'text-emerald-600 dark:text-emerald-400',
};

export const ConnectionRow: React.FC<ConnectionRowProps> = ({
  icon,
  name,
  description,
  variant,
  status = 'connected',
  accountInfo,
  lastSynced,
  onConnect,
  onViewDetails,
  onDisconnect,
  isConnecting = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isConnected = variant === 'connected';
  const statusInfo = statusConfig[status || 'connected'] || defaultStatusConfig;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div
      className={cn(
        'group flex items-center gap-4 px-4 py-3 bg-surface-secondary/20 border border-border-primary rounded-lg transition-all',
        'hover:bg-surface-secondary/40 hover:border-border-primary/80'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-colors',
          'bg-surface-tertiary text-text-secondary',
          'group-hover:bg-primary-500/10 group-hover:text-primary-500'
        )}
      >
        {icon}
      </div>

      {/* Name & Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-text-primary truncate">{name}</h3>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
            {accountInfo && (
              <>
                <span className="truncate max-w-[180px]">{accountInfo}</span>
                {lastSynced && <span className="text-text-tertiary/50">•</span>}
              </>
            )}
            {lastSynced && (
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Clock className="w-3 h-3" />
                {lastSynced}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary mt-0.5 truncate">{description}</p>
        )}
      </div>

      {/* Status or Connect Button */}
      <div className="flex-shrink-0 flex items-center gap-3">
        {isConnected ? (
          <>
            {/* Status Badge */}
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', statusInfo.dotClass)} />
              <span className={cn('text-xs font-medium whitespace-nowrap', statusInfo.textClass)}>
                {statusInfo.label}
              </span>
            </div>

            {/* Actions Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  'text-text-tertiary hover:text-text-primary',
                  'hover:bg-surface-secondary',
                  menuOpen && 'bg-surface-secondary text-text-primary'
                )}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-surface-primary border border-border-primary rounded-lg shadow-lg z-50">
                  {onViewDetails && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onViewDetails();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  )}
                  {onDisconnect && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDisconnect();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
              isConnecting
                ? 'bg-primary-400 text-white cursor-wait'
                : 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md hover:shadow-primary-500/20'
            )}
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Connecting...</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Connect</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionRow;
