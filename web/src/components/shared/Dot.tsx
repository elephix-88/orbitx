import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const dotVariants = cva('inline-block w-2 h-2 rounded-full align-middle', {
 variants: {
 variant: {
 success: 'bg-success',
 warning: 'bg-warning',
 danger: 'bg-danger',
 blue: 'bg-blue-primary',
 muted: 'bg-text-4',
 },
 },
 defaultVariants: {
 variant: 'muted',
 },
});

export interface DotProps
 extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
 VariantProps<typeof dotVariants> {
 pulseRing?: boolean;
}

export const Dot = React.forwardRef<HTMLSpanElement, DotProps>(
 ({ className, variant, pulseRing, ...props }, ref) => (
 <span
 ref={ref}
 className={cn(dotVariants({ variant }), pulseRing && 'pulse-ring', className)}
 {...props}
 />
 )
);

Dot.displayName = 'Dot';

// eslint-disable-next-line react-refresh/only-export-components
export { dotVariants };
export default Dot;
