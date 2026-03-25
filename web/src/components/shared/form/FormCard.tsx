import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormCard: React.FC<FormCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = "from-primary-400 to-primary-600",
  children,
  className = ""
}) => {
  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="bg-surface-secondary rounded-lg border border-neutral-800 overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="bg-neutral-900 px-6 py-5">
          <div className="flex items-center space-x-4">
            {Icon && (
              <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-md">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-neutral-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6 bg-surface-secondary">
          {children}
        </div>
      </div>
    </div>
  );
};

interface FormFieldProps {
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  icon: Icon,
  iconColor = "text-primary-400",
  description,
  children,
  className = ""
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2.5">
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
        <label className="text-sm font-medium text-text-primary">
          {label}
        </label>
      </div>
      {children}
      {description && (
        <p className="text-sm text-text-secondary pl-7">
          {description}
        </p>
      )}
    </div>
  );
};

interface InfoCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  children,
  className = ""
}) => {
  return (
    <div className={`rounded-lg p-5 border border-neutral-800 bg-surface-secondary ${className}`}>
      <div className="flex items-center space-x-2.5 mb-3">
        <div className="w-5 h-5 rounded-md bg-primary-400/10 flex items-center justify-center">
          <svg className="w-3 h-3 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-text-primary">
          {title}
        </h3>
      </div>
      {description && (
        <p className="text-sm text-text-secondary mb-4">
          {description}
        </p>
      )}
      {children}
    </div>
  );
};
