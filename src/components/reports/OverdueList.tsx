import { Link } from 'react-router-dom';
import type { OverdueItem } from '@/types';
import { OVERDUE_KIND_LABELS, STATUS_LABELS } from '@/lib/labels';
import { cn, formatHours } from '@/lib/utils';
import { Empty } from '@/components/ui/States';

export function OverdueList({ items, showPeople = true }: { items: OverdueItem[]; showPeople?: boolean }) {
  if (!items.length) return <Empty text="Kechikayotgan ish yo'q — barakalla!" />;
  return (
    <div className="divide-y divide-gray-100">
      {items.map((i) => (
        <div key={`${i.kind}-${i.orderId}-${i.since}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-gray-900">
              <Link to={`/orders/${i.orderId}`} className="font-bold text-brand-700 hover:underline">{i.orderNumber}</Link> · {i.clientName}
            </p>
            <p className="text-xs text-gray-500">
              {OVERDUE_KIND_LABELS[i.kind]} · {STATUS_LABELS[i.status]}
              {showPeople && i.responsible?.length ? <> · Javobgar: <b className="text-gray-700">{i.responsible.map((r) => r.fullName).join(', ')}</b></> : null}
            </p>
          </div>
          <span className={cn('shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold', i.hoursLate >= 48 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900')}>
            {formatHours(i.hoursLate)} kechikmoqda
          </span>
        </div>
      ))}
    </div>
  );
}
