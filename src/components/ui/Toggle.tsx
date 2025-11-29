import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  color?: 'cyan' | 'green' | 'purple' | 'amber';
  size?: 'sm' | 'md';
}

const colors = {
  cyan: 'bg-neon-cyan',
  green: 'bg-neon-green',
  purple: 'bg-neon-purple',
  amber: 'bg-amber-400',
};

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  color = 'cyan',
  size = 'md',
}) => {
  const isSmall = size === 'sm';
  
  return (
    <div className={`flex items-center justify-between p-2.5 sm:p-3 bg-slate-800/50 rounded-lg border border-white/5 ${disabled ? 'opacity-50' : ''}`}>
      {(label || description) && (
        <div className="flex-1 min-w-0 pr-3">
          {label && <span className="text-xs sm:text-sm font-medium text-slate-300 block">{label}</span>}
          {description && <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative rounded-full transition-colors flex-shrink-0 touch-feedback ${
          isSmall ? 'w-9 h-5' : 'w-11 h-6'
        } ${checked ? colors[color] : 'bg-slate-600'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            isSmall 
              ? `w-4 h-4 ${checked ? 'translate-x-4' : 'translate-x-0'}`
              : `w-5 h-5 ${checked ? 'translate-x-5' : 'translate-x-0'}`
          }`}
        />
      </button>
    </div>
  );
};
