import { cn } from '@/lib/utils';

export function Tabs<T extends string>({ value, onChange, items }: {
  value: T; onChange: (v: T) => void; items: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1" role="tablist" data-pdf-hide>
      {items.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', value === t.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
