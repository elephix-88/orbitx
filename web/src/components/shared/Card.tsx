import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-[6px] border bg-[#1A2744] transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-[rgba(0,212,255,0.12)]',
        interactive: 'border-[rgba(0,212,255,0.12)] hover:border-[rgba(0,212,255,0.25)] hover:shadow-[0_0_12px_rgba(0,212,255,0.08)] cursor-pointer',
        selected: 'border-[#00D4FF] border-2 shadow-[0_0_12px_rgba(0,212,255,0.15)]',
        connection: 'border-[rgba(0,212,255,0.12)] hover:border-[rgba(0,212,255,0.25)] hover:shadow-[0_0_12px_rgba(0,212,255,0.08)] cursor-pointer h-[200px] flex flex-col',
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
        <h3 className="text-base font-bold uppercase tracking-wider text-[#E8ECF4]">{title}</h3>
        {description && (
          <p className="text-sm text-[#8896AD]">{description}</p>
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