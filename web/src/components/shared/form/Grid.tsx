import React from 'react';

export const FormGrid: React.FC<React.HTMLAttributes<HTMLDivElement> & { cols?: 1 | 2 | 3 }>
  = ({ className, cols = 2, children, ...rest }) => (
  <div
    className={`grid grid-cols-1 ${cols >= 2 ? 'md:grid-cols-2' : ''} ${cols >= 3 ? 'lg:grid-cols-3' : ''} gap-4 ${className || ''}`}
    {...rest}
  >
    {children}
  </div>
);


