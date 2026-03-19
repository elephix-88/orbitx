import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-sm border bg-white transition-all duration-200 dark:bg-slate-900 dark:border-slate-800',
  {
    variants: {
      variant: {
        default: 'border-[#A8DADC] dark:border-slate-800 dark:hover:border-slate-700',
        interactive: 'border-[#A8DADC] hover:border-[#1D3557] cursor-pointer dark:border-slate-800 dark:hover:border-brand-600/60',
        selected: 'border-[#E63946] border-2 dark:border-[#E63946]',
        connection: 'border-[#A8DADC] hover:border-[#1D3557] cursor-pointer h-[200px] flex flex-col dark:border-slate-800 dark:hover:border-brand-600/60',
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
      className={`flex items-start justify-between gap-4 ${className || ''}`}
      {...props}
    >
      <div className="space-y-1">
        <h3 className="text-base font-bold uppercase tracking-wider text-[#1D3557] dark:text-slate-100">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>
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
  <div ref={ref} className={`pt-4 flex-1 ${className || ''}`} {...props} />
));

CardContent.displayName = 'CardContent';

// Card Footer
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center justify-between gap-2 pt-4 ${className || ''}`}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter'; 