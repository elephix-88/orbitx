// =============================================================================
// ConnectionPrompt - Prompt to set up connections
// =============================================================================
// Reusable component shown when a feature requires a connection that doesn't exist.
// Provides clear guidance and a direct link to the Connections page.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConnectionPromptProps {
  /** The type of connection needed (e.g., 'Facebook Ads', 'Google Ads') */
  connectionType: string;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Visual variant */
  variant?: 'warning' | 'info';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Callback when user clicks the connection button */
  onNavigate?: () => void;
}

/**
 * Prompt component shown when a connection is required but not set up.
 *
 * @example
 * ```tsx
 * <ConnectionPrompt connectionType="Facebook Ads" />
 *
 * // With custom content
 * <ConnectionPrompt
 *   connectionType="Google Ads"
 *   title="Connect Google Ads"
 *   description="Link your Google Ads account to start pulling campaign data."
 *   variant="info"
 * />
 * ```
 */
export const ConnectionPrompt: React.FC<ConnectionPromptProps> = ({
  connectionType,
  title,
  description,
  variant = 'warning',
  size = 'md',
  className,
  onNavigate,
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    onNavigate?.();
    navigate('/connections');
  };

  const displayTitle = title || `No ${connectionType} Connection`;
  const displayDescription = description ||
    `You need to connect your ${connectionType} account before you can use this feature.`;

  const variantStyles = {
    warning: {
      container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-800/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-800 dark:text-amber-300',
      description: 'text-amber-700 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-800/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-800 dark:text-blue-300',
      description: 'text-blue-700 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const sizeStyles = {
    sm: {
      container: 'p-3',
      icon: 'w-4 h-4',
      iconWrapper: 'p-1.5',
      title: 'text-xs font-medium mb-0.5',
      description: 'text-xs mb-2',
      button: 'px-2.5 py-1 text-xs gap-1',
      buttonIcon: 'w-3 h-3',
    },
    md: {
      container: 'p-4',
      icon: 'w-5 h-5',
      iconWrapper: 'p-2',
      title: 'text-sm font-medium mb-1',
      description: 'text-xs mb-3',
      button: 'px-3 py-1.5 text-xs gap-1.5',
      buttonIcon: 'w-3.5 h-3.5',
    },
    lg: {
      container: 'p-5',
      icon: 'w-6 h-6',
      iconWrapper: 'p-2.5',
      title: 'text-base font-semibold mb-1',
      description: 'text-sm mb-4',
      button: 'px-4 py-2 text-sm gap-2',
      buttonIcon: 'w-4 h-4',
    },
  };

  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  const Icon = variant === 'warning' ? AlertTriangle : Link2;

  return (
    <div
      className={cn(
        'border rounded-xl',
        styles.container,
        sizes.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg flex-shrink-0', styles.iconBg, sizes.iconWrapper)}>
          <Icon className={cn(styles.iconColor, sizes.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn(styles.title, sizes.title)}>
            {displayTitle}
          </h4>
          <p className={cn(styles.description, sizes.description)}>
            {displayDescription}
          </p>
          <button
            type="button"
            onClick={handleNavigate}
            className={cn(
              'inline-flex items-center font-medium rounded-lg transition-colors',
              styles.button,
              sizes.button
            )}
          >
            <ExternalLink className={sizes.buttonIcon} />
            Set Up Connection
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Inline version of ConnectionPrompt for use in forms
 */
export const InlineConnectionPrompt: React.FC<{
  connectionType: string;
  className?: string;
}> = ({ connectionType, className }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/connections')}
      className={cn(
        'w-full flex items-center gap-2 p-3 rounded-xl',
        'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
        'text-sm text-amber-700 dark:text-amber-400',
        'hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors',
        className
      )}
    >
      <Link2 className="w-4 h-4" />
      <span>
        No {connectionType} connection. <span className="underline">Add one now</span>
      </span>
    </button>
  );
};

export default ConnectionPrompt;
