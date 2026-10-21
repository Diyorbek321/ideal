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
      {label && <label htmlFor={areaId} className="block text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        id={areaId}
        ref={ref}
        aria-invalid={!!error}
        className={cn(
          'min-h-[80px] w-full rounded-xl border border-gray-300 bg-white transition-colors placeholder:text-gray-400 hover:border-gray-400 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-4 focus:ring-brand-300/50',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
