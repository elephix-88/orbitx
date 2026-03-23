import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose: (_id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  title,
  description,
  duration = 5000,
  action,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const typeClasses = {
    success: 'bg-success-light border-success/20 text-success-dark',
    error: 'bg-error-light border-error/20 text-error-dark',
    warning: 'bg-warning-light border-warning/20 text-warning-dark',
    info: 'bg-info-light border-info/20 text-info-dark',
  };

  const iconColorClasses = {
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    info: 'text-info',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-md border shadow-lg transition-all duration-300 ease-out max-w-md',
        typeClasses[type],
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      )}
    >
      <div className={cn('flex-shrink-0 mt-0.5', iconColorClasses[type])}>
        {icons[type]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="text-sm opacity-90 mt-1">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium underline mt-2 hover:no-underline"
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Toast Container
export const ToastContainer: React.FC<{ toasts: ToastProps[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>,
    document.body
  );
};

// Toast Hook
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: removeToast,
    };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (title: string, description?: string) =>
    addToast({ type: 'success', title, description });

  const error = (title: string, description?: string) =>
    addToast({ type: 'error', title, description });

  const warning = (title: string, description?: string) =>
    addToast({ type: 'warning', title, description });

  const info = (title: string, description?: string) =>
    addToast({ type: 'info', title, description });

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
};
