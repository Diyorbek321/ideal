import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api';
import { ROLE_LABELS } from '@/lib/labels';
import { cn, currentPeriod, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { Stat } from '@/components/reports/charts';
import { OverdueList } from '@/components/reports/OverdueList';
import { MonthInput, periodLabel, usePdfExport } from '@/components/reports/ReportToolbar';

/** Xodimlar qilishi kerak bo'lgan, lekin o'z vaqtida bajarmagan ishlar */
export default function OverduePage() {
  const [period, setPeriod] = React.useState(currentPeriod());
  const pdf = usePdfExport(`kechikkan-ishlar_${period}`);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['analytics', 'overdue', period], queryFn: () => analyticsApi.overdue(period) });

  return (
    <div ref={pdf.ref} className="space-y-6 bg-gray-50">
      <PageHeader title="Kechikkan ishlar" subtitle={`O'z vaqtida bajarilmagan ishlar va javobgarlar · ${periodLabel(period)}`}
        actions={<div className="flex flex-wrap gap-2" data-pdf-hide><MonthInput value={period} onChange={setPeriod} />{pdf.button}</div>} />
      {isLoading ? <Loading rows={6} /> : error || !data ? <ErrorState error={error} onRetry={refetch} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat tone={data.items.length ? 'bad' : 'good'} label="Hozir kechikmoqda" value={`${data.items.length} ta`} />
            <Stat label="Oyda yopilgan (muddatli)" value={`${data.completedCount} ta`} />
            <Stat tone={data.lateCount ? 'bad' : 'default'} label="Kech topshirilgan" value={`${data.lateCount} ta`} />
            <Stat tone="brand" label="O'z vaqtida" value={data.completedCount ? `${Math.round(((data.completedCount - data.lateCount) / data.completedCount) * 100)}%` : '—'} />
          </div>

          <Card title="Xodimlar bo'yicha" description="Hozir kechikayotgan ishlar va oyda kech topshirilgan buyurtmalar">
            {data.users.length === 0 ? <Empty text="Ma'lumot yo'q" /> : (
              <div className="-mx-5 overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-2 font-semibold sm:px-6">Xodim</th>
                      <th className="px-2 py-2 text-right font-semibold">Kechikmoqda</th>
                      <th className="px-2 py-2 text-right font-semibold">Kech topshirgan</th>
                      <th className="px-2 py-2 text-right font-semibold">Vaqtida</th>
                      <th className="px-5 py-2 text-right font-semibold sm:px-6">Intizom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-2 sm:px-6"><p className="font-medium text-gray-900">{u.fullName}</p><p className="text-xs text-gray-500">{ROLE_LABELS[u.role]}</p></td>
                        <td className={cn('px-2 py-2 text-right tabular-nums', u.open && 'font-bold text-red-600')}>{u.open}</td>
                        <td className={cn('px-2 py-2 text-right tabular-nums', u.lateDone && 'font-semibold text-amber-700')}>{u.lateDone}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{u.onTimeDone}</td>
                        <td className="px-5 py-2 text-right sm:px-6">
                          {u.onTimePercent == null ? '—' : (
                            <span className={cn('rounded-lg px-2 py-0.5 text-xs font-semibold', u.onTimePercent >= 90 ? 'bg-emerald-100 text-emerald-800' : u.onTimePercent >= 70 ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800')}>
                              {u.onTimePercent}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Hozir kechikayotgan ishlar"><OverdueList items={data.items} /></Card>

          <Card title="Oyda kech topshirilgan buyurtmalar">
            {data.lateCompleted.length === 0 ? <Empty text="Hammasi o'z vaqtida topshirilgan" /> : (
              <div className="divide-y divide-gray-100 text-sm">
                {data.lateCompleted.map((o) => (
                  <div key={o.orderId} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between">
                    <p><Link to={`/orders/${o.orderId}`} className="font-bold text-brand-700 hover:underline">{o.orderNumber}</Link> · {o.clientName}
                      <span className="block text-xs text-gray-500">{o.responsible?.map((r) => r.fullName).join(', ')}</span></p>
                    <p className="text-gray-600">Muddat {formatDate(o.deadline)} → topshirildi <b className="text-red-600">{formatDate(o.completedAt)}</b></p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
