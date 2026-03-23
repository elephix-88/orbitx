import React from 'react';
import { useNotificationStore, type Notification } from '../../hooks/useNotification';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const notificationVariants = cva(
  'pointer-events-auto relative flex items-center justify-between space-x-4 overflow-hidden rounded-md p-5 shadow-sm transition-all duration-300 bg-surface-primary border border-border',
  {
    variants: {
      type: {
        success: 'border-l-4 border-l-success',
        error: 'border-l-4 border-l-error',
        warning: 'border-l-4 border-l-warning',
        info: 'border-l-4 border-l-info',
      },
      layout: {
        banner: 'w-[420px] sm:w-[460px]',
        center: 'w-[420px] sm:w-[460px]',
      },
      compact: {
        true: 'px-6 py-5 rounded-md text-left',
        false: '',
      }
    },
    defaultVariants: { type: 'info', layout: 'banner' },
  }
);

const iconColors = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
};

interface NotificationItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem = ({
  notification,
  onClose,
  className: _className,
  ...props
}: NotificationItemProps) => {
  const { type, title, message, centered, compact, emoji, details } = notification;

  return (
    <div
      className={cn(
        notificationVariants({ type: type as keyof typeof iconColors, layout: centered ? 'center' : 'banner', compact: compact as boolean }),
        centered && 'mx-auto',
        'animate-in slide-in-from-right-5 fade-in duration-300'
      )}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0" aria-hidden="true">
          {emoji ? (
            <span className="text-2xl" role="img" aria-label={type}>{emoji}</span>
          ) : (
            <Icon type={type} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-text-primary truncate" title={title}>
            {title}
          </p>
          {message && (
            <p className="mt-1 text-sm text-text-secondary break-words" title={message}>
              {message}
            </p>
          )}
          {Array.isArray(details) && details.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-text-secondary list-disc list-inside">
              {details.map((d, i) => (
                <li key={i} className="break-words">{d}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="ml-4 flex flex-shrink-0">
        <button
          type="button"
          className="inline-flex rounded-md p-1 text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          onClick={onClose}
          aria-label="Close notification"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

const Icon = ({ type }: { type: Notification['type'] }) => {
  const iconClass = cn('h-5 w-5', iconColors[type || 'info']);

  switch (type) {
    case 'success':
      return <CheckCircle className={iconClass} />;
    case 'error':
      return <XCircle className={iconClass} />;
    case 'warning':
      return <AlertTriangle className={iconClass} />;
    case 'info':
    default:
      return <Info className={iconClass} />;
  }
};

export const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {notifications.map((notification) => (
          <div key={notification.id} className={notification.centered ? 'fixed inset-0 flex items-center justify-center' : ''}>
            <NotificationItem
              notification={notification}
              onClose={() => removeNotification(notification.id)}
              className={notification.centered ? '' : ''}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
