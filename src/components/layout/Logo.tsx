import { cn } from '@/lib/utils';
import { MARK_PATH, MARK_VIEWBOX, WORD_PATH, WORD_VIEWBOX } from './logoPaths';

// onBrand: qizil fonda logotip oq rangda chiziladi
export function Logo({ className, compact, onBrand }: { className?: string; compact?: boolean; onBrand?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', onBrand ? 'text-white' : 'text-[#FF000A]', className)} aria-label="Ideal Dizayn">
      <svg viewBox={MARK_VIEWBOX} className="h-8 w-8 shrink-0" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d={MARK_PATH} />
      </svg>
      {!compact && (
        <svg viewBox={WORD_VIEWBOX} className="h-3.5 w-[122px]" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d={WORD_PATH} />
        </svg>
      )}
    </span>
  );
}
