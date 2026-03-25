import React from 'react';

export const Section: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={`p-5 ${className || ''}`} {...rest}>{children}</div>
);

export const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode; actions?: React.ReactNode }>
  = ({ title, icon, actions }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2 text-text-primary">
      {icon}
      <h4 className="text-md font-medium">{title}</h4>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);


