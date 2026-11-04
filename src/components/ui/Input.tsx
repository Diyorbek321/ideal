import * as React from 'react';
import { cn } from '@/lib/utils';
import { useMoneyFormat } from './useMoneyFormat';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Pul maydoni: "1 250 000" ko'rinishida, onChange'ga faqat raqamlar keladi */
  money?: boolean;
}

function assignRef<T>(ref: React.ForwardedRef<T>, el: T | null) {
  if (typeof ref === 'function') ref(el);
  else if (ref) ref.current = el;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, money, value, onChange, placeholder, ...props }, ref) => {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const fmt = useMoneyFormat(value, onChange);
  const moneyProps = money
    ? { value: fmt.displayValue, onChange: fmt.handleChange, inputMode: 'numeric' as const, placeholder: fmtPlaceholder(placeholder) }
    : { value, onChange, placeholder };
  return (
    <div className="w-full space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
      <input
        id={inputId}
        ref={(el) => { fmt.elRef.current = el; assignRef(ref, el); }}
        aria-invalid={!!error}
        className={cn(
          'flex h-11 w-full rounded-xl border border-gray-300 bg-white transition-colors hover:border-gray-400 sm:h-10 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
        {...moneyProps}
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

const fmtPlaceholder = (p: string | undefined) => (p && /^\d+$/.test(p) ? p.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : p);

/** Jadval katagi uchun yalang'och pul maydoni (label/xatosiz) */
function MoneyInput({ value, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const fmt = useMoneyFormat(value, onChange);
  return <input ref={fmt.elRef} inputMode="numeric" {...props} value={fmt.displayValue} onChange={fmt.handleChange} />;
}

export { Input, MoneyInput };
