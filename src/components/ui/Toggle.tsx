import React from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  color?: 'cyan' | 'green' | 'purple' | 'amber';
  size?: 'sm' | 'md';
}

const colorClasses = {
  cyan: 'text-neon-cyan',
  green: 'text-neon-green',
  purple: 'text-neon-purple',
  amber: 'text-amber-400',
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
  const iconSize = size === 'sm' ? 28 : 32;
  
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
        className={`flex-shrink-0 transition-colors ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {checked ? (
          <ToggleRight size={iconSize} className={colorClasses[color]} />
        ) : (
          <ToggleLeft size={iconSize} className="text-slate-500" />
        )}
      </button>
    </div>
  );
};
