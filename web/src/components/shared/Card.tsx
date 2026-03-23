import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-lg border bg-surface-primary transition-all duration-200 dark:bg-surface-primary',
  {
    variants: {
      variant: {
        default: 'border-border',
        interactive: 'border-border hover:border-primary-300 cursor-pointer dark:hover:border-primary-600/40',
        selected: 'border-primary-500 border-2 ring-1 ring-primary-200',
        connection: 'border-border hover:border-primary-300 cursor-pointer h-[200px] flex flex-col dark:hover:border-primary-600/40',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  as?: React.ElementType;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cardVariants({ variant, padding, className })}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card Header
export interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader = ({
  className,
  title,
  description,
  action,
  ...props
}: CardHeaderProps & Omit<React.HTMLAttributes<HTMLDivElement>, keyof CardHeaderProps>) => {
  return (
    <div
      className={cn('flex items-start justify-between gap-4', className)}
      {...props}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

CardHeader.displayName = 'CardHeader';

// Card Content
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-4 flex-1', className)} {...props} />
));

CardContent.displayName = 'CardContent';

// Card Footer
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between gap-2 pt-4', className)}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter'; 