import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variants = {
  default: 'bg-slate-900/50 border border-white/10',
  glass: 'bg-white/5 backdrop-blur-lg border border-white/10',
  outline: 'border border-white/10 bg-transparent',
  gradient: 'bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-white/10',
};

const paddings = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        rounded-xl
        transition-all duration-200
        ${variants[variant]}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
