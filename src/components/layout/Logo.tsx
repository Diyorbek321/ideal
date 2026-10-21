import { cn } from '@/lib/utils';

// Korporativ saytdagi CMYK belgisi bilan bir xil
const MARK = ['bg-[#00A3D9]', 'bg-[#C8175D]', 'bg-brand-400', 'bg-gray-900'];

// onYellow: sariq fonda sariq kvadrat ko'rinmaydi — oqqa almashadi
export function Logo({ className, compact, onYellow }: { className?: string; compact?: boolean; onYellow?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-display text-[1.05rem] tracking-tight text-gray-900', className)}>
      <span className="grid grid-cols-2 gap-[3px]" aria-hidden="true">
        {MARK.map((c) => <i key={c} className={cn('h-2.5 w-2.5 rounded-[3px]', onYellow && c === 'bg-brand-400' ? 'bg-white' : c)} />)}
      </span>
      {!compact && <span className="font-medium">Ideal<b className="font-bold">Dizayn</b></span>}
    </span>
  );
}
