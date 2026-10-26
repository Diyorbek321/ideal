import type { PriceListItem } from '@/types';
import { PRICE_UNIT_LABELS } from '@/lib/labels';
import { formatCurrency } from '@/lib/utils';

interface Props {
  services: PriceListItem[];
  value: string[];
  onChange: (codes: string[]) => void;
  /** Narxni ham ko'rsatish (masalan "Luvers · 2 000 so'm/dona") */
  showPrice?: boolean;
}

// Narxlar ro'yxatidagi xizmatlarni (pardozlash) belgilash — kalkulyator, buyurtma va mahsulot turi uchun bitta
export function ServiceChips({ services, value, onChange, showPrice = false }: Props) {
  if (services.length === 0) return <p className="text-xs text-gray-400">Xizmatlar yo'q — Sozlamalar → Narxlar'da "Pardozlash" turida qo'shing</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {services.map((f) => {
        const on = value.includes(f.code);
        return (
          <button
            key={f.code}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((c) => c !== f.code) : [...value, f.code])}
            className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-gray-900 bg-brand-300 font-medium text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
          >
            {f.name}
            {showPrice && <span className="ml-1 text-gray-500">· {formatCurrency(f.price)}/{PRICE_UNIT_LABELS[f.unit]}</span>}
          </button>
        );
      })}
    </div>
  );
}
