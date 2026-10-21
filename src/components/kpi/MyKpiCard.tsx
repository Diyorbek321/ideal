import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Target } from 'lucide-react';
import { kpiApi } from '@/api';
import { formatCurrency } from '@/lib/utils';

/** Xodimning bosh ekranida: jamoa rejasi va shu oy yig'ilgan bonusi — har kuni ko'rinib turadi */
export function MyKpiCard() {
  const { data } = useQuery({ queryKey: ['kpi', 'me'], queryFn: () => kpiApi.me(), refetchInterval: 5 * 60_000 });
  if (!data?.eligible) return null;
  const pct = Math.min(100, data.progress);

  return (
    <Link to="/kpi" className="group block rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-900 sm:p-5">
      <div className="flex items-center gap-4">
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-400 text-gray-900 sm:flex"><Target className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-gray-500">Jamoa rejasi: <b className="text-gray-900">{data.closedCount}</b> / {data.plan} buyurtma</p>
            <p className="shrink-0 text-sm text-gray-500">Bonusim: <b className="font-display text-base text-gray-900">{formatCurrency(data.total)}</b></p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand-400 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {data.overPlan > 0
              ? `Reja ${data.overPlan} taga oshdi — fond o'smoqda`
              : `Rejagacha ${data.plan - data.closedCount} ta buyurtma qoldi`}
            {' · '}o'z vaqtida: {data.onTimeOrders.length} ta
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-900" />
      </div>
    </Link>
  );
}
