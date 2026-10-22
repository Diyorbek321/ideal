import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api';
import { cn, formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading } from '@/components/ui/States';
import { C, Delta, Donut, MonthlyBars } from '@/components/reports/charts';
import { periodShort } from '@/components/reports/ReportToolbar';

/** Tushum va xarajat nisbati: oyma-oy grafik + xarajatlar tarkibi */
export function FinanceCharts({ period }: { period: string }) {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['analytics', 'finance', period], queryFn: () => analyticsApi.finance(period) });
  if (isLoading) return <Card><Loading rows={5} /></Card>;
  if (error || !data) return <Card><ErrorState error={error} onRetry={refetch} /></Card>;

  const c = data.current;
  const trend = data.trend.map((t) => ({ ...t, label: periodShort(t.period) }));
  const ratio = c.expenseRatio;
  const top = data.expensesByCategory.slice(0, 8);

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card title="Tushum va xarajat nisbati" description="Har 100 so'm tushumdan qanchasi xarajatga ketdi">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Xarajat / tushum</p>
            <p className={cn('font-display text-3xl font-bold tabular-nums', ratio == null ? 'text-gray-400' : ratio > 100 ? 'text-red-600' : ratio > 70 ? 'text-amber-600' : 'text-emerald-700')}>
              {ratio == null ? '—' : `${ratio}%`}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div className={cn('h-full rounded-full', (ratio ?? 0) > 100 ? 'bg-red-600' : 'bg-gray-900')} style={{ width: `${Math.min(100, ratio ?? 0)}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">{ratio == null ? 'Bu oy tushum yo\'q' : ratio > 100 ? 'Xarajat tushumdan ko\'p — zarar' : `Qolgan ${Math.round(100 - ratio)}% — sof oqim`}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Tushum</p>
            <p className="font-display text-xl font-bold tabular-nums">{formatCurrency(c.revenue)}</p>
            <p className="mt-1 text-xs"><Delta now={c.revenue} prev={data.previous?.revenue} /></p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Xarajat</p>
            <p className="font-display text-xl font-bold tabular-nums">{formatCurrency(c.expenses)}</p>
            <p className="mt-1 text-xs"><Delta now={c.expenses} prev={data.previous?.expenses} inverse /></p>
          </div>
        </div>
        <p className="mb-2 mt-6 text-sm font-semibold text-gray-900">Oxirgi 6 oy</p>
        <MonthlyBars data={trend} series={[
          { key: 'revenue', name: 'Tushum', color: C.yellow },
          { key: 'expenses', name: 'Xarajat', color: C.red },
          { key: 'profit', name: 'Sof oqim', color: C.ink, type: 'line' },
        ]} />
      </Card>

      <Card title="Xarajatlar — nimaga qancha" description="Tanlangan oy bo'yicha kategoriyalar">
        {top.length === 0 ? <Empty text="Bu oyda xarajat kiritilmagan" /> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Donut data={top.map((x) => ({ name: x.category, value: x.amount }))} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-2 font-semibold">Kategoriya</th>
                    <th className="px-2 py-2 text-right font-semibold">Summa</th>
                    <th className="px-2 py-2 text-right font-semibold" title="Tushumga nisbatan">Tushumdan</th>
                    <th className="py-2 pl-2 text-right font-semibold">O'tgan oy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expensesByCategory.map((x) => (
                    <tr key={x.category} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-2 font-medium">{x.category}<span className="block text-xs text-gray-400">{x.count} ta · {x.share}%</span></td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold">{formatCurrency(x.amount)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{x.ofRevenue == null ? '—' : `${x.ofRevenue}%`}</td>
                      <td className="py-2 pl-2 text-right tabular-nums text-gray-500">{formatCurrency(x.prevAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/** Xarajatlar sahifasi uchun: kategoriya ustunlari + kunlik xarajat */
export function ExpenseCharts({ period }: { period: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'finance', period], queryFn: () => analyticsApi.finance(period) });
  if (isLoading) return <Card><Loading rows={4} /></Card>;
  if (!data || data.expensesByCategory.length === 0) return null;
  const days = data.expensesByDay.map((d) => ({ label: `${d.day.slice(8, 10)}.${d.day.slice(5, 7)}`, amount: d.amount }));
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <Card title="Xarajatlar ulushi">
        <Donut data={data.expensesByCategory.slice(0, 8).map((x) => ({ name: x.category, value: x.amount }))} />
      </Card>
      <Card title="Kunlik xarajat" description={data.current.revenue ? `Tushumning ${data.current.expenseRatio}% i xarajatga ketdi` : undefined}>
        <MonthlyBars data={days} series={[{ key: 'amount', name: 'Xarajat', color: C.red }]} className="h-64" />
      </Card>
    </div>
  );
}
