import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const chipVariants = cva(
 'inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full text-[11.5px] font-medium border',
 {
 variants: {
 variant: {
 success: 'text-success bg-success-bg border-success-border',
 warning: 'text-warning bg-warning-bg border-warning-border',
 danger: 'text-danger bg-danger-bg border-danger-border',
 blue: 'text-blue-primary bg-blue-soft border-blue-border',
 violet: 'text-violet bg-violet-bg border-violet-border',
 soft: 'text-text-2 bg-bg-muted border-line-1',
 },
 },
 defaultVariants: {
 variant: 'soft',
 },
 }
);

export interface ChipProps
 extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
 VariantProps<typeof chipVariants> {
 children: React.ReactNode;
}

export const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
 ({ className, variant, children, ...props }, ref) => (
 <span ref={ref} className={cn(chipVariants({ variant }), className)} {...props}>
 {children}
 </span>
 )
);

Chip.displayName = 'Chip';

// eslint-disable-next-line react-refresh/only-export-components
export { chipVariants };
export default Chip;
