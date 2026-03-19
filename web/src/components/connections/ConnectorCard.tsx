import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Trash2 } from 'lucide-react';

type ConnectorCardProps = {
  icon: React.ReactNode;
  name: string;
  description?: string;
  variant: 'connected' | 'available';
  statusText?: string;
  secondaryText?: React.ReactNode;
  footer: React.ReactNode;
  onDelete?: () => void;
};

export const ConnectorCard: React.FC<ConnectorCardProps> = ({
  icon,
  name,
  description,
  variant,
  statusText,
  secondaryText,
  footer,
  onDelete,
}) => {
  const isConnected = variant === 'connected';

  return (
    <div className={cn(
      "bg-surface-secondary/30 border rounded-xl flex flex-col transition-all group relative",
      "border-border-primary hover:border-border-primary/80"
    )}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg flex-shrink-0 transition-colors",
            "bg-surface-tertiary text-text-secondary group-hover:bg-brand-500/10 group-hover:text-brand-500"
          )}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-text-primary truncate">
              {name}
            </h3>
            {isConnected ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-text-secondary font-medium">{statusText}</span>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary mt-0.5">Data Source</p>
            )}
          </div>
          {/* Show checkmark normally, but replace with delete button on hover */}
          {isConnected && (
            <div className="relative">
              {/* Checkmark - visible by default, hidden on hover when delete is available */}
              <div className={cn(
                "p-1 rounded-full bg-surface-tertiary transition-opacity",
                onDelete && "group-hover:opacity-0"
              )}>
                <Check className="w-3.5 h-3.5 text-text-tertiary" />
              </div>
              {/* Delete button - hidden by default, visible on hover */}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="absolute inset-0 p-1 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all duration-200"
                  title="Remove connection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 flex-1">
        {isConnected ? (
          <div className="text-sm text-text-secondary truncate">
            {secondaryText}
          </div>
        ) : (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border-primary/30 flex gap-2 mt-auto">
        {footer}
      </div>
    </div>
  );
};

export default ConnectorCard;
