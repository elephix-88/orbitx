import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modern Modal Component
 * Inspired by shadcn/ui and Tailwind UI patterns
 * - Portal rendering for proper z-index stacking
 * - Smooth animations with data-state attributes
 * - Focus trap and keyboard navigation
 * - Accessible with proper ARIA attributes
 */

const modalVariants = cva(
  [
    'relative w-full flex flex-col',
    'bg-[#1A2744]',
    'rounded-[6px] shadow-[0_0_24px_rgba(0,212,255,0.08)]',
    'border border-[rgba(0,212,255,0.12)]',
  ],
  {
    variants: {
      size: {
        xs: 'max-w-sm',
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        '2xl': 'max-w-6xl',
        full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
        screen: 'w-screen h-screen max-w-none max-h-none rounded-none border-0',
      },
      height: {
        auto: 'max-h-[calc(100vh-4rem)]',
        fit: '',
        full: 'h-[calc(100vh-4rem)]',
      },
    },
    defaultVariants: {
      size: 'md',
      height: 'auto',
    },
  }
);

export interface ModalProps extends VariantProps<typeof modalVariants> {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  headerless?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size,
  height,
  closeOnOverlayClick = true,
  headerless = false,
  showCloseButton = true,
  className,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus the modal after animation
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
      onClick={handleOverlayClick}
      role="presentation"
    >
      {/* Overlay - shadcn/ui style */}
      <div
        className={cn(
          "fixed inset-0 z-50",
          "bg-[#0F1729]/80 backdrop-blur-sm",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        )}
        data-state="open"
        aria-hidden="true"
      />

      {/* Modal Content - shadcn/ui style */}
      <div
        ref={modalRef}
        className={cn(
          modalVariants({ size, height }),
          "z-50 gap-4 p-6",
          "duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        data-state="open"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
      >
        {/* Header */}
        {!headerless && (title || showCloseButton) && (
          <div className="flex flex-col space-y-1.5 text-left -m-6 mb-0 px-6 py-4 border-b border-[rgba(0,212,255,0.12)]" style={{ borderImage: 'linear-gradient(90deg, #00D4FF, transparent) 1' }}>
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-bold uppercase tracking-wider leading-none text-[#E8ECF4]"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-description"
                className="text-sm text-[#8896AD]"
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Close button - positioned absolutely */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className={cn(
              "absolute right-4 top-4",
              "rounded-[4px] opacity-90 transition-opacity",
              "hover:opacity-100 text-[#8896AD] hover:text-[#E8ECF4]",
              "focus:outline-none focus:ring-2 focus:ring-[rgba(0,212,255,0.4)]",
              "disabled:pointer-events-none"
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

/**
 * Dialog component - for confirmations and alerts
 * Following shadcn/ui AlertDialog pattern
 */
export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning' | 'success';
}

export const Dialog = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  icon,
  variant = 'default',
}: DialogProps) => {
  const variantStyles = {
    default: {
      iconBg: 'bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.12)]',
      iconColor: 'text-[#8896AD]',
    },
    danger: {
      iconBg: 'bg-[rgba(255,77,106,0.1)] border border-[rgba(255,77,106,0.2)]',
      iconColor: 'text-[#FF4D6A]',
    },
    warning: {
      iconBg: 'bg-[rgba(255,184,0,0.1)] border border-[rgba(255,184,0,0.2)]',
      iconColor: 'text-[#FFB800]',
    },
    success: {
      iconBg: 'bg-[rgba(0,229,160,0.1)] border border-[rgba(0,229,160,0.2)]',
      iconColor: 'text-[#00E5A0]',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      headerless
      showCloseButton={false}
      closeOnOverlayClick={false}
    >
      <div className="flex flex-col gap-4">
        {/* Icon + Title section */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {icon && (
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px]",
              styles.iconBg
            )}>
              <div className={styles.iconColor}>{icon}</div>
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-[#E8ECF4]">
              {title}
            </h3>
            {description && (
              <p className="mt-2 text-sm text-[#8896AD]">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Custom content */}
        {children && <div>{children}</div>}

        {/* Actions */}
        {actions && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </Modal>
  );
};
