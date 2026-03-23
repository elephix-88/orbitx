import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock, LogOut, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface SessionWarningModalProps {
  minutesRemaining: number | null;
  onDismiss: () => void;
  onLogout: () => void;
}

/**
 * Session warning modal - shadcn/ui style
 */
export function SessionWarningModal({
  minutesRemaining,
  onDismiss,
  onLogout,
}: SessionWarningModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    },
    [onDismiss]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/80"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className={cn(
        "relative z-50 w-full max-w-md",
        "bg-surface-primary",
        "rounded-lg shadow-lg",
        "border border-border",
        "p-6"
      )}>
        {/* Close button */}
        <button
          onClick={onDismiss}
          className={cn(
            "absolute right-4 top-4",
            "rounded-md opacity-70 transition-opacity hover:opacity-100",
            "focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-4">
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-light dark:bg-warning-dark/20">
              <Clock className="h-5 w-5 text-warning dark:text-warning" />
            </div>
            <div className="flex-1">
              <h2
                id="session-warning-title"
                className="text-lg font-semibold text-text-primary"
              >
                Session Expiring Soon
              </h2>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
                </span>
                <span className="text-sm font-medium text-warning">
                  {minutesRemaining !== null
                    ? `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} remaining`
                    : 'Expiring soon'}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              Your session will expire soon for security reasons. You'll be automatically
              logged out when it ends.
            </p>
            <p className="text-sm text-text-secondary">
              Please save any unsaved work before the session expires.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onDismiss}
            >
              Continue Working
            </Button>
            <Button
              variant="warning"
              onClick={onLogout}
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Logout Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
