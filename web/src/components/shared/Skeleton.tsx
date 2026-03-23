import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-neutral-200 dark:bg-neutral-700';

  const variantClasses = {
    text: 'h-4 rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    card: 'rounded-md',
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, variantClasses.text)}
            style={{
              width: i === lines - 1 ? '75%' : '100%',
              height: height || '1rem',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{
        width: width || (variant === 'circular' ? height : '100%'),
        height: height || (variant === 'text' ? '1rem' : '2rem'),
      }}
    />
  );
};

// Pre-built skeleton components for common use cases
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 border border-border rounded-md', className)}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" className="mt-2" />
      </div>
    </div>
    <Skeleton variant="text" lines={3} />
  </div>
);

export const WorkflowCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 border border-border rounded-md', className)}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" width={32} height={32} />
        <div>
          <Skeleton variant="text" width="120px" />
          <Skeleton variant="text" width="80px" className="mt-1" />
        </div>
      </div>
      <Skeleton variant="rectangular" width={60} height={24} />
    </div>
    <Skeleton variant="text" lines={2} />
    <div className="flex items-center justify-between mt-4">
      <Skeleton variant="text" width="100px" />
      <div className="flex space-x-2">
        <Skeleton variant="rectangular" width={32} height={32} />
        <Skeleton variant="rectangular" width={32} height={32} />
      </div>
    </div>
  </div>
);

export const ConnectionCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 border border-border rounded-md', className)}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton variant="rectangular" width={48} height={48} className="rounded-md" />
      <div className="flex-1">
        <Skeleton variant="text" width="140px" />
        <Skeleton variant="text" width="200px" className="mt-2" />
      </div>
    </div>
    <div className="flex items-center justify-between">
      <Skeleton variant="rectangular" width={80} height={24} />
      <Skeleton variant="rectangular" width={100} height={36} />
    </div>
  </div>
);