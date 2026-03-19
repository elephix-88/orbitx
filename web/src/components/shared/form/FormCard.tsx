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
  iconColor = "from-brand-500 to-purple-600",
  children,
  className = ""
}) => {
  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Modern Glass Card */}
      <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-[#A8DADC] dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
        {/* Header with gradient */}
        <div className="bg-[#1D3557] px-6 py-5">
          <div className="flex items-center space-x-4">
            {Icon && (
              <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-sm">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider text-white dark:text-white">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-[#A8DADC] mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6 bg-white dark:bg-transparent">
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
  iconColor = "text-brand-600 dark:text-brand-400",
  description,
  children,
  className = ""
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2.5">
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
        <label className="text-xs font-bold uppercase tracking-wider text-[#1D3557] dark:text-slate-200">
          {label}
        </label>
      </div>
      {children}
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-7">
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
    <div className={`rounded-sm p-5 border border-[#A8DADC] dark:border-brand-500/20 bg-[#F1FAEE] dark:bg-brand-900/10 ${className}`}>
      <div className="flex items-center space-x-2.5 mb-3">
        <div className="w-5 h-5 rounded-sm bg-[#A8DADC]/30 dark:bg-brand-500/20 flex items-center justify-center">
          <svg className="w-3 h-3 text-brand-600 dark:text-brand-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1D3557] dark:text-white">
          {title}
        </h3>
      </div>
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {description}
        </p>
      )}
      {children}
    </div>
  );
};
