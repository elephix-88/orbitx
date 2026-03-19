import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sheet Component - Slide-over panel for forms and detailed content
 * Based on shadcn/ui Sheet pattern
 *
 * Use Sheet instead of Modal when:
 * - Displaying forms or configuration
 * - Showing detailed content that complements the main view
 * - Users need to reference the main content while working
 *
 * Use Modal/Dialog when:
 * - Confirming destructive actions
 * - Showing critical alerts
 * - Requiring focused attention
 */

const sheetVariants = cva(
  [
    'fixed z-50 gap-4 bg-white dark:bg-slate-950 shadow-sm',
    'transition-transform duration-300 ease-in-out',
    'flex flex-col',
  ],
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b border-[#A8DADC] dark:border-slate-800',
        bottom: 'inset-x-0 bottom-0 border-t border-[#A8DADC] dark:border-slate-800',
        left: 'inset-y-0 left-0 h-full border-r border-[#A8DADC] dark:border-slate-800',
        right: 'inset-y-0 right-0 h-full border-l border-[#A8DADC] dark:border-slate-800',
      },
      size: {
        sm: '',
        default: '',
        lg: '',
        xl: '',
        full: '',
      },
    },
    compoundVariants: [
      // Right side sizes
      { side: 'right', size: 'sm', class: 'w-[320px] max-w-full' },
      { side: 'right', size: 'default', class: 'w-[400px] max-w-full' },
      { side: 'right', size: 'lg', class: 'w-[540px] max-w-full' },
      { side: 'right', size: 'xl', class: 'w-[720px] max-w-full' },
      { side: 'right', size: 'full', class: 'w-screen' },
      // Left side sizes
      { side: 'left', size: 'sm', class: 'w-[320px] max-w-full' },
      { side: 'left', size: 'default', class: 'w-[400px] max-w-full' },
      { side: 'left', size: 'lg', class: 'w-[540px] max-w-full' },
      { side: 'left', size: 'xl', class: 'w-[720px] max-w-full' },
      { side: 'left', size: 'full', class: 'w-screen' },
      // Top/Bottom sizes
      { side: 'top', size: 'sm', class: 'h-[200px]' },
      { side: 'top', size: 'default', class: 'h-[300px]' },
      { side: 'top', size: 'lg', class: 'h-[400px]' },
      { side: 'top', size: 'xl', class: 'h-[500px]' },
      { side: 'top', size: 'full', class: 'h-screen' },
      { side: 'bottom', size: 'sm', class: 'h-[200px]' },
      { side: 'bottom', size: 'default', class: 'h-[300px]' },
      { side: 'bottom', size: 'lg', class: 'h-[400px]' },
      { side: 'bottom', size: 'xl', class: 'h-[500px]' },
      { side: 'bottom', size: 'full', class: 'h-screen' },
    ],
    defaultVariants: {
      side: 'right',
      size: 'default',
    },
  }
);

export interface SheetProps extends VariantProps<typeof sheetVariants> {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export const Sheet = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'default',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
}: SheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);

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

    const timer = setTimeout(() => {
      sheetRef.current?.focus();
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

  // Animation classes based on side
  const getSlideAnimation = () => {
    switch (side) {
      case 'top':
        return isOpen ? 'translate-y-0' : '-translate-y-full';
      case 'bottom':
        return isOpen ? 'translate-y-0' : 'translate-y-full';
      case 'left':
        return isOpen ? 'translate-x-0' : '-translate-x-full';
      case 'right':
      default:
        return isOpen ? 'translate-x-0' : 'translate-x-full';
    }
  };

  const sheetContent = (
    <div
      className="fixed inset-0 z-50"
      onClick={handleOverlayClick}
      role="presentation"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/70"
        aria-hidden="true"
      />

      {/* Sheet Panel */}
      <div
        ref={sheetRef}
        className={cn(
          sheetVariants({ side, size }),
          getSlideAnimation(),
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sheet-title" : undefined}
        aria-describedby={description ? "sheet-description" : undefined}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex flex-col space-y-2 p-6 bg-[#1D3557] text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {title && (
                <h2
                  id="sheet-title"
                  className="text-lg font-bold uppercase tracking-wider text-white"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="sheet-description"
                  className="mt-1 text-sm text-[#A8DADC]"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  "rounded-sm opacity-90 transition-opacity hover:opacity-100 text-white",
                  "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1D3557]",
                  "dark:focus:ring-slate-300"
                )}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-col-reverse gap-2 p-6 border-t border-[#A8DADC] dark:border-slate-800 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
};

/**
 * SheetHeader - Reusable header section
 */
export const SheetHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn("flex flex-col space-y-2", className)}>
    {children}
  </div>
);

/**
 * SheetTitle - Title component
 */
export const SheetTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h2 className={cn("text-lg font-semibold text-slate-950 dark:text-slate-50", className)}>
    {children}
  </h2>
);

/**
 * SheetDescription - Description component
 */
export const SheetDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>
    {children}
  </p>
);

/**
 * SheetFooter - Footer with actions
 */
export const SheetFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>
    {children}
  </div>
);
