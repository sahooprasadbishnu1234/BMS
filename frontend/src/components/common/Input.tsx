import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, prefix, suffix, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 text-slate-400 font-mono font-bold text-sm pointer-events-none select-none">
              {prefix}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-slate-900/90 border ${
              error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-primary-500 focus:ring-primary-500'
            } rounded-lg ${prefix ? 'pl-8' : 'px-3.5'} ${suffix ? 'pr-12' : 'px-3.5'} py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-all ${className}`}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 text-slate-500 font-mono text-xs pointer-events-none select-none">
              {suffix}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-rose-400 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
