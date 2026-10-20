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
        {label && <label htmlFor={selectId} className="text-sm font-medium text-gray-700">{label}</label>}
        <select
          id={selectId}
          ref={ref}
          aria-invalid={!!error}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50',
            error && 'border-red-500',
            className,
          )}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
