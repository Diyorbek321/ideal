import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, id, ...props }, ref) => {
  const autoId = React.useId();
  const areaId = id ?? autoId;
  return (
    <div className="w-full space-y-1.5">
      {label && <label htmlFor={areaId} className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        id={areaId}
        ref={ref}
        aria-invalid={!!error}
        className={cn(
          'min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
