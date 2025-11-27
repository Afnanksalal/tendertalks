import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  color?: 'cyan' | 'green' | 'purple';
}

const colors = {
  cyan: 'bg-neon-cyan',
  green: 'bg-neon-green',
  purple: 'bg-neon-purple',
};

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  color = 'cyan',
}) => {
  return (
    <div className={`flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5 ${disabled ? 'opacity-50' : ''}`}>
      {(label || description) && (
        <div className="flex-1 min-w-0 pr-3">
          {label && <span className="text-sm font-medium text-slate-300 block">{label}</span>}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? colors[color] : 'bg-slate-600'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
};
