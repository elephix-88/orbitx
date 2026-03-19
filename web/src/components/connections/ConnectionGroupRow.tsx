import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Eye, Trash2, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-500 dark:text-slate-400',
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

export interface ConnectionItem {
  id: string;
  accountInfo: string;
  status?: string;
  createdAt?: string;
}

type ConnectionGroupRowProps = {
  icon: React.ReactNode;
  name: string;
  connections: ConnectionItem[];
  onViewDetails: (connection: ConnectionItem) => void;
  onDisconnect: (connectionId: string) => void;
};

export const ConnectionGroupRow: React.FC<ConnectionGroupRowProps> = ({
  icon,
  name,
  connections,
  onViewDetails,
  onDisconnect,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const connectionCount = connections.length;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  return (
    <div className="rounded-lg border border-border-primary overflow-hidden bg-surface-secondary/10">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
          'hover:bg-surface-secondary/40',
          isExpanded && 'border-b border-border-primary'
        )}
      >
        {/* Expand Icon */}
        <motion.div
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        </motion.div>

        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
            'bg-surface-tertiary text-text-secondary'
          )}
        >
          {icon}
        </div>

        {/* Name & Count */}
        <span className="font-medium text-text-primary">{name}</span>
        <span className="text-sm text-text-tertiary">
          ({connectionCount} {connectionCount === 1 ? 'connection' : 'connections'})
        </span>
      </button>

      {/* Connections List with Animation */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="py-1">
              {connections.map((connection, index) => {
                const statusInfo = statusConfig[connection.status || 'connected'] || defaultStatusConfig;

                return (
                  <motion.div
                    key={connection.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3',
                      'hover:bg-surface-secondary/30 transition-colors'
                    )}
                  >
                    {/* Bullet Point */}
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary flex-shrink-0" />

                    {/* Account Info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary font-medium truncate block">
                        {connection.accountInfo}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn('w-2 h-2 rounded-full', statusInfo.dotClass)} />
                      <span className={cn('text-xs font-medium', statusInfo.textClass)}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* View Details Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(connection);
                      }}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-secondary/50 hover:bg-surface-secondary border border-border-primary rounded-md transition-colors"
                    >
                      View Details
                    </motion.button>

                    {/* More Actions Menu */}
                    <div className="relative flex-shrink-0" ref={openMenuId === connection.id ? menuRef : undefined}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === connection.id ? null : connection.id);
                        }}
                        className={cn(
                          'p-1.5 rounded-md transition-colors',
                          'text-text-tertiary hover:text-text-primary',
                          'hover:bg-surface-secondary',
                          openMenuId === connection.id && 'bg-surface-secondary text-text-primary'
                        )}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {openMenuId === connection.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-1 w-36 py-1 bg-surface-primary border border-border-primary rounded-lg shadow-lg z-50"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onViewDetails(connection);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onDisconnect(connection.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Disconnect
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectionGroupRow;
