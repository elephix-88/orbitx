import React from 'react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
  };

  const iconSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      sizeClasses[size],
      className
    )}>
      {icon && (
        <div className={cn(
          'flex items-center justify-center rounded-sm bg-[#F1FAEE] text-[#1D3557] mb-4 dark:bg-slate-800 dark:text-slate-500 border border-[#A8DADC]',
          iconSizeClasses[size]
        )}>
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-bold uppercase tracking-wider text-[#1D3557] dark:text-slate-100 mb-2">
        {title}
      </h3>
      
      <p className="text-[#457B9D] dark:text-slate-400 max-w-md mb-6">
        {description}
      </p>
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Pre-built empty states for common scenarios
export const NoWorkflowsEmptyState: React.FC<{
  onCreateWorkflow: () => void;
  onBrowseTemplates?: () => void;
}> = ({ onCreateWorkflow, onBrowseTemplates }) => (
  <EmptyState
    icon={
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
    title="No workflows yet"
    description="Create your first automated workflow to get started with data processing and integration."
    action={{
      label: "Create Workflow",
      onClick: onCreateWorkflow,
    }}
    secondaryAction={onBrowseTemplates ? {
      label: "Browse Templates",
      onClick: onBrowseTemplates,
    } : undefined}
  />
);

export const NoConnectionsEmptyState: React.FC<{
  onAddConnection: () => void;
}> = ({ onAddConnection }) => (
  <EmptyState
    icon={
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    }
    title="No connections configured"
    description="Connect to your data sources and destinations to start building workflows."
    action={{
      label: "Add Connection",
      onClick: onAddConnection,
    }}
  />
);

export const NoSearchResultsEmptyState: React.FC<{
  searchTerm: string;
  onClearSearch: () => void;
}> = ({ searchTerm, onClearSearch }) => (
  <EmptyState
    icon={
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    }
    title="No results found"
    description={`No items match "${searchTerm}". Try adjusting your search or browse all items.`}
    action={{
      label: "Clear Search",
      onClick: onClearSearch,
      variant: "outline",
    }}
    size="sm"
  />
);
