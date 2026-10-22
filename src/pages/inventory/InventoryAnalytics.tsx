import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api';
import { UNIT_LABELS } from '@/lib/labels';
import { cn, currentPeriod, formatCurrency, formatNumber } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { C, Donut, MonthlyBars, Stat } from '@/components/reports/charts';
import { MonthInput, periodLabel, periodShort, usePdfExport } from '@/components/reports/ReportToolbar';

/** Ombor tahlili: oy davomida nima qancha sarflandi, qancha xarid qilindi, nima tugayapti */
export function InventoryAnalytics({ tabs }: { tabs: React.ReactNode }) {
  const [period, setPeriod] = React.useState(currentPeriod());
  const pdf = usePdfExport(`ombor-tahlili_${period}`);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['analytics', 'inventory', period], queryFn: () => analyticsApi.inventory(period) });

  return (
    <div ref={pdf.ref} className="space-y-6 bg-gray-50">
      <PageHeader title="Ombor tahlili" subtitle={`Oylik sarf va xarid · ${periodLabel(period)}`}
        actions={<div className="flex flex-wrap gap-2" data-pdf-hide>{tabs}<MonthInput value={period} onChange={setPeriod} />{pdf.button}</div>} />
      {isLoading ? <Loading rows={6} /> : error || !data ? <ErrorState error={error} onRetry={refetch} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat tone="brand" label="Sarflangan material" value={formatCurrency(data.totals.consumedCost)} hint="tannarx bo'yicha" />
            <Stat label="Xarid qilingan" value={formatCurrency(data.totals.purchasedCost)} />
            <Stat label="Chiqindi (brak)" value={formatCurrency(data.totals.wasteCost)} tone={data.totals.wasteCost > 0 ? 'bad' : 'default'} />
            <Stat label="Kam qolgan" value={`${data.totals.lowStock} ta`} tone={data.totals.lowStock ? 'bad' : 'good'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <Card title="Oxirgi 6 oy: sarf va xarid">
              <MonthlyBars data={data.trend.map((t) => ({ ...t, label: periodShort(t.period) }))} series={[
                { key: 'consumedCost', name: 'Sarf', color: C.ink },
                { key: 'purchasedCost', name: 'Xarid', color: C.yellow },
              ]} />
            </Card>
            <Card title="Sarf kategoriyalar bo'yicha">
              {data.byCategory.length ? <Donut data={data.byCategory.map((c) => ({ name: c.category, value: c.cost }))} /> : <Empty text="Bu oyda sarf yo'q" />}
            </Card>
          </div>

          {data.byDay.length > 0 && (
            <Card title="Kunlik sarf">
              <MonthlyBars className="h-56" data={data.byDay.map((d) => ({ label: `${d.day.slice(8, 10)}.${d.day.slice(5, 7)}`, cost: d.cost }))}
                series={[{ key: 'cost', name: 'Sarf', color: C.ink }]} />
            </Card>
          )}

          <Card title="Materiallar bo'yicha" description="«Yetadi» — shu oydagi sarf sur'atida qoldiq necha kunga yetishi">
            {data.materials.length === 0 ? <Empty text="Materiallar yo'q" /> : (
              <div className="-mx-5 overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-2 font-semibold sm:px-6">Material</th>
                      <th className="px-2 py-2 text-right font-semibold">Sarf</th>
                      <th className="px-2 py-2 text-right font-semibold">Summa</th>
                      <th className="px-2 py-2 text-right font-semibold">Kirim</th>
                      <th className="px-2 py-2 text-right font-semibold">Chiqindi</th>
                      <th className="px-2 py-2 text-right font-semibold">Qoldiq</th>
                      <th className="px-5 py-2 text-right font-semibold sm:px-6">Yetadi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.materials.map((m) => {
                      const u = UNIT_LABELS[m.unit];
                      return (
                        <tr key={m.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-2 sm:px-6"><p className="font-medium text-gray-900">{m.name}</p><p className="text-xs text-gray-400">{m.category}</p></td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(m.consumed, m.consumed % 1 ? 1 : 0)} {u}</td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatCurrency(m.consumedCost)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-600">{formatNumber(m.received, m.received % 1 ? 1 : 0)} {u}</td>
                          <td className={cn('px-2 py-2 text-right tabular-nums', m.wastePercent > 10 ? 'font-semibold text-red-600' : 'text-gray-600')}>
                            {m.waste ? `${formatNumber(m.waste, 1)} ${u} · ${m.wastePercent}%` : '—'}
                          </td>
                          <td className={cn('px-2 py-2 text-right tabular-nums', m.isLow && 'font-semibold text-red-600')}>{formatNumber(m.stock, m.stock % 1 ? 1 : 0)} {u}</td>
                          <td className={cn('px-5 py-2 text-right tabular-nums sm:px-6', m.daysLeft != null && m.daysLeft < 7 ? 'font-semibold text-red-600' : 'text-gray-600')}>
                            {m.daysLeft == null ? '—' : `${m.daysLeft} kun`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
