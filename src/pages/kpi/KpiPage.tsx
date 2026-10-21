import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Settings, Target, TrendingUp, Users } from 'lucide-react';
import { kpiApi } from '@/api';
import type { KpiSummary } from '@/types';
import { useUser } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/labels';
import { cn, currentPeriod, formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';

function PlanBar({ s }: { s: KpiSummary }) {
  const pct = Math.min(100, s.progress);
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Oylik reja (yopilgan buyurtmalar)</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-gray-900">{s.closedCount}<span className="text-lg text-gray-400"> / {s.plan}</span></p>
        </div>
        <p className={cn('rounded-xl px-3 py-1.5 text-sm font-semibold', s.overPlan > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-700')}>
          {s.overPlan > 0 ? `Reja ${s.overPlan} taga oshdi` : `Rejagacha ${Math.max(0, s.plan - s.closedCount)} ta qoldi`}
        </p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-brand-400 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <p><span className="text-gray-500">Jamoa fondi:</span> <b>{formatCurrency(s.fund)}</b></p>
        <p><span className="text-gray-500">Har kishiga:</span> <b>{formatCurrency(s.planShare)}</b></p>
        <p><span className="text-gray-500">O'z vaqtida topshirilgan:</span> <b>{s.onTimeCount} ta</b></p>
      </div>
    </Card>
  );
}

function Rules() {
  return (
    <Card title="Bonus qanday hisoblanadi">
      <ul className="space-y-3 text-sm text-gray-600">
        <li className="flex gap-3"><Target className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" />Oy davomida rejadan oshgan har bir yopilgan buyurtma uchun jamoa fondiga pul tushadi. Fond oy oxirida xodimlar o'rtasida teng bo'linadi.</li>
        <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" />Buyurtma muddatigacha topshirilsa — unda ishlagan har bir xodim (menejer, dizayner, pechatchi, montajchi) bonus oladi. Kechiksa — hech kim olmaydi.</li>
        <li className="flex gap-3"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" />Bonus oylikka qo'shiladi va oylik varaqasida alohida qatorda ko'rinadi.</li>
      </ul>
    </Card>
  );
}

function MyView({ period }: { period: string }) {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['kpi', 'me', period], queryFn: () => kpiApi.me(period) });
  if (isLoading) return <Loading rows={4} />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="space-y-6">
      <PlanBar s={data} />
      {data.eligible ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[['Reja bonusi', data.planBonus], ['O\'z vaqtida bonusi', data.onTimeBonus], ['Jami bonusim', data.total]].map(([l, v], i) => (
            <Card key={l as string} className={cn('p-5', i === 2 && 'border-0 bg-gray-900 text-white')}>
              <p className={cn('text-sm', i === 2 ? 'text-gray-300' : 'text-gray-500')}>{l}</p>
              <p className={cn('mt-1 font-display text-2xl font-bold tabular-nums', i === 2 && 'text-brand-400')}>{formatCurrency(v as number)}</p>
            </Card>
          ))}
        </div>
      ) : <Card><Empty text="Siz KPI tizimiga kirmaysiz" /></Card>}
      {data.onTimeOrders.length > 0 && (
        <Card title="O'z vaqtida topshirilgan buyurtmalarim">
          <div className="flex flex-wrap gap-2">
            {data.onTimeOrders.map((o) => (
              <Link key={o.orderId} to={`/orders/${o.orderId}`} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800 hover:underline">{o.orderNumber}</Link>
            ))}
          </div>
        </Card>
      )}
      <Rules />
    </div>
  );
}

function TeamView({ period }: { period: string }) {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['kpi', 'team', period], queryFn: () => kpiApi.team(period) });
  if (isLoading) return <Loading rows={6} />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const total = data.users.reduce((s, u) => s + u.total, 0);
  return (
    <div className="space-y-6">
      <PlanBar s={data} />
      <Card title="Xodimlar bo'yicha" description={`Jami bonus: ${formatCurrency(total)}`}
        actions={<Link to="/settings?tab=kpi" className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"><Settings className="h-4 w-4" />Reja va summalar</Link>}>
        {data.users.length === 0 ? <Empty icon={Users} text="KPI ga kiradigan xodim yo'q" /> : (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold sm:px-6">Xodim</th>
                  <th className="px-3 py-3 text-right font-semibold">Reja bonusi</th>
                  <th className="px-3 py-3 text-right font-semibold">O'z vaqtida</th>
                  <th className="px-5 py-3 text-right font-semibold sm:px-6">Jami</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3 sm:px-6"><p className="font-medium text-gray-900">{u.fullName}</p><p className="text-xs text-gray-500">{ROLE_LABELS[u.role]}</p></td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(u.planBonus)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(u.onTimeBonus)}<span className="block text-xs text-gray-500">{u.onTimeOrders.length} ta buyurtma</span></td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums sm:px-6">{formatCurrency(u.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Rules />
    </div>
  );
}

export default function KpiPage() {
  const user = useUser();
  const [period, setPeriod] = React.useState(currentPeriod());
  return (
    <div className="space-y-6">
      <PageHeader title={user.role === 'ADMIN' ? 'KPI va bonuslar' : 'Mening KPIm'} subtitle="Ko'proq buyurtma va o'z vaqtida topshirish — ko'proq bonus"
        actions={<Input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="w-44" aria-label="Davr" />} />
      {user.role === 'ADMIN' ? <TeamView period={period} /> : <MyView period={period} />}
    </div>
  );
}
