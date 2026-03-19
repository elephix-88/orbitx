import React from 'react';
import { Dialog } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2, AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  variant?: 'danger' | 'warning';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmLoading = false,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const icons = {
    danger: <Trash2 className="w-6 h-6" />,
    warning: <AlertTriangle className="w-6 h-6" />,
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={typeof message === 'string' ? message : undefined}
      icon={icons[variant]}
      variant={variant}
      actions={
        <>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={confirmLoading}
            className="sm:w-auto w-full"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'warning'}
            onClick={onConfirm}
            isLoading={confirmLoading}
            className="sm:w-auto w-full"
          >
            {confirmText}
          </Button>
        </>
      }
    >
      {typeof message !== 'string' && message}
    </Dialog>
  );
}

/**
 * Alert Dialog - for informational alerts
 */
interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'info' | 'warning' | 'success';
  onClose: () => void;
}

export function AlertDialog({
  isOpen,
  title,
  message,
  buttonText = 'OK',
  variant = 'info',
  onClose,
}: AlertDialogProps) {
  const icons = {
    info: <AlertCircle className="w-6 h-6" />,
    warning: <AlertTriangle className="w-6 h-6" />,
    success: <AlertCircle className="w-6 h-6" />,
  };

  const dialogVariant = variant === 'info' ? 'default' : variant;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      icon={icons[variant]}
      variant={dialogVariant}
      actions={
        <Button variant="primary" onClick={onClose} className="sm:w-auto w-full">
          {buttonText}
        </Button>
      }
    />
  );
}
