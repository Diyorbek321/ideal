import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn(s, i <= Math.round(value) ? 'fill-brand-400 text-brand-500' : 'text-gray-300')} />)}
    </span>
  );
}

/** Bosib tanlanadigan yulduzlar (so'rovnoma uchun) */
export function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} ball`} onClick={() => onChange(i)}
            className="rounded-lg p-1 transition-transform active:scale-90">
            <Star className={cn('h-8 w-8', i <= value ? 'fill-brand-400 text-brand-500' : 'text-gray-300')} />
          </button>
        ))}
      </div>
    </div>
  );
}
