import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowUpRight, ChevronRight, Clock, PackageX, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { reportsApi } from '@/api';
import { RevenueChart } from '@/components/finance/RevenueChart';
import { MyKpiCard } from '@/components/kpi/MyKpiCard';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading } from '@/components/ui/States';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { useUser } from '@/lib/auth';
import { SOURCE_LABELS, STATUS_LABELS, UNIT_LABELS } from '@/lib/labels';
import { cn, deadlineText, formatCompact, formatHours, formatLongDate } from '@/lib/utils';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}


function Kpi({ label, value, icon: Icon, to, alert }: {
  label: string; value: React.ReactNode; icon: typeof Clock; to: string; alert?: boolean;
}) {
  return (
    <Link to={to} className="group">
      <Card className={cn(
        'flex h-full flex-col justify-between gap-4 p-4 transition-colors sm:p-5',
        alert ? 'border-red-200 bg-red-50 hover:border-red-300' : 'hover:border-gray-900',
      )}>
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-[13px] font-medium leading-tight', alert ? 'text-red-700' : 'text-gray-500')}>{label}</p>
          <Icon className={cn('h-4 w-4 shrink-0', alert ? 'text-red-600' : 'text-gray-400 group-hover:text-gray-900')} />
        </div>
        <p className={cn('font-display text-xl font-bold leading-none tabular-nums sm:text-2xl', alert ? 'text-red-700' : 'text-gray-900')}>
          {value}
        </p>
      </Card>
    </Link>
  );
}

// Uzun o'zbekcha nomlar sig'ishi uchun gorizontal chiziqlar (aylana diagramma o'rniga)
function BarList({ rows, onPick }: { rows: Array<{ key: string; label: string; value: number }>; onPick?: (key: string) => void }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            disabled={!onPick}
            onClick={() => onPick?.(r.key)}
            className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-lg px-3 py-2 text-left text-sm enabled:hover:bg-gray-50"
          >
            <span className="absolute inset-y-1 left-0 rounded-md bg-brand-200/70 transition-[width] group-enabled:group-hover:bg-brand-300" style={{ width: `${(r.value / max) * 100}%` }} />
            <span className="relative truncate font-medium text-gray-800">{r.label}</span>
            <span className="relative font-display text-sm font-bold tabular-nums text-gray-900">{r.value}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useUser();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportsApi.dashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Loading rows={8} />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;

  const { kpi } = data;
  const statusRows = data.ordersByStatus.map((s) => ({ key: s.status, label: STATUS_LABELS[s.status], value: s.count }));
  const sourceRows = data.ordersBySource
    .map((s) => ({ key: s.source, label: SOURCE_LABELS[s.source], value: s.count }))
    .sort((a, b) => b.value - a.value);
  const revenueData = data.revenueByDay.map((r) => ({ day: r.day.slice(8, 10) + '.' + r.day.slice(5, 7), amount: r.amount }));
  const firstName = user.fullName.split(' ')[0];

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <p className="text-sm text-gray-500">{formatLongDate(new Date())}</p>
        <h1 className="mt-1 font-display text-xl font-bold text-gray-900 sm:text-2xl">{greeting()}, {firstName}</h1>
      </div>
      <MyKpiCard />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Muddati o'tgan" value={kpi.overdue} icon={AlertTriangle} to="/orders?overdueOnly=true" alert={kpi.overdue > 0} />
        <Kpi label="Tasdiqlash kutilmoqda" value={kpi.waitingApproval} icon={AlertCircle} to="/orders?status=TASDIQDA" />
        <Kpi label="Jarayondagi ishlar" value={kpi.inProgress} icon={Clock} to="/orders?view=kanban" />
        <Kpi label="Bugungi buyurtmalar" value={kpi.todayOrders} icon={ShoppingBag} to="/orders" />
        <Kpi label="Oy tushumi" value={<>{formatCompact(kpi.revenueThisMonth)}<span className="ml-1 font-sans text-sm font-medium text-gray-500">so'm</span></>} icon={TrendingUp} to="/finance" />
        <Kpi label="Umumiy nasiya" value={<>{formatCompact(kpi.totalDebt)}<span className="ml-1 font-sans text-sm font-medium text-gray-500">so'm</span></>} icon={Wallet} to="/finance" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Card title="Muammoli buyurtmalar" description="SLA yoki muddati o'tganlar" className="lg:col-span-2"
          actions={<Link to="/orders?overdueOnly=true" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">Hammasi<ArrowUpRight className="h-4 w-4" /></Link>}>
          {data.problemOrders.length ? (
            <ul className="-mx-2 divide-y divide-gray-100">
              {data.problemOrders.map((o) => {
                const dl = deadlineText(o.deadline);
                return (
                  <li key={o.id}>
                    <button onClick={() => navigate(`/orders/${o.id}`)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-gray-900">{o.number}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <p className="mt-0.5 truncate text-sm text-gray-500">{o.client.name}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        <p className="font-semibold text-red-700">
                          {formatHours((Date.now() - new Date(o.statusChangedAt).getTime()) / 3_600_000)}
                        </p>
                        <p className={cn('mt-0.5', dl?.late ? 'font-medium text-red-700' : 'text-gray-500')}>{dl?.text ?? '—'}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <Empty text="Hammasi o'z vaqtida — muammoli buyurtma yo'q" />}
        </Card>

        <Card title="Faol buyurtmalar" description="Bosqich bo'yicha">
          {statusRows.length
            ? <BarList rows={statusRows} onPick={(s) => navigate(`/orders?status=${s}`)} />
            : <Empty text="Faol buyurtmalar yo'q" />}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Card title="Tushum" description="Oxirgi 30 kun" className="lg:col-span-2">
          {revenueData.length ? (
            <RevenueChart data={revenueData} />
          ) : <Empty text="To'lovlar hali yo'q" />}
        </Card>

        <div className="space-y-4 lg:space-y-6">
          <Card title="Manbalar" description="Shu oy">
            {sourceRows.length ? <BarList rows={sourceRows} /> : <Empty text="Shu oy buyurtmalar yo'q" />}
          </Card>

          <Card title="Omborda kam qolgan">
            {data.lowStock.length ? (
              <ul className="space-y-2">
                {data.lowStock.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-xl bg-red-50 px-3 py-2.5">
                    <PackageX className="h-4 w-4 shrink-0 text-red-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{m.name}</p>
                      <p className="text-xs text-red-700">{m.stock} {UNIT_LABELS[m.unit]} · min {m.minStock}</p>
                    </div>
                    <Link to="/inventory" className="shrink-0 text-xs font-semibold text-gray-900 underline-offset-2 hover:underline">Kirim</Link>
                  </li>
                ))}
              </ul>
            ) : <p className="py-4 text-center text-sm text-gray-500">Barcha materiallar yetarli.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
