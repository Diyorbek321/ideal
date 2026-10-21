import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const autoId = React.useId();
    const selectId = id ?? autoId;
    return (
      <div className="w-full space-y-1.5">
        {label && <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">{label}</label>}
        <select
          id={selectId}
          ref={ref}
          aria-invalid={!!error}
          className={cn(
            'flex h-11 w-full rounded-xl border border-gray-300 bg-white transition-colors hover:border-gray-400 sm:h-10 px-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-4 focus:ring-brand-300/50 disabled:opacity-50',
            error && 'border-red-500',
            className,
          )}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
