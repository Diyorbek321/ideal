import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Lightbulb, MessageSquare } from 'lucide-react';
import { analyticsApi, feedbackApi } from '@/api';
import type { Insight } from '@/types';
import { CLIENT_TYPE_LABELS, HEARD_FROM_LABELS, SOURCE_LABELS } from '@/lib/labels';
import { cn, currentPeriod, formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { C, Delta, Donut, HorizontalBars, MonthlyBars, Stat } from '@/components/reports/charts';
import { MonthInput, periodLabel, periodShort, usePdfExport } from '@/components/reports/ReportToolbar';
import { Stars } from '@/components/feedback/Stars';

function monthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return { from: new Date(y, m - 1, 1).toISOString(), to: new Date(y, m, 1).toISOString() };
}

const TONE = {
  good: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  warn: { icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50 text-amber-900' },
  info: { icon: Lightbulb, cls: 'border-gray-200 bg-white text-gray-800' },
};

function Insights({ items }: { items: Insight[] }) {
  if (!items.length) return <Empty text="Tavsiya uchun ma'lumot yetarli emas" />;
  return (
    <ul className="space-y-2">
      {items.map((i) => {
        const t = TONE[i.tone];
        return (
          <li key={i.text} className={cn('flex gap-3 rounded-xl border p-3 text-sm', t.cls)}>
            <t.icon className="mt-0.5 h-4 w-4 shrink-0" />{i.text}
          </li>
        );
      })}
    </ul>
  );
}

function FeedbackList({ period }: { period: string }) {
  const [lowOnly, setLowOnly] = React.useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['feedback', period, lowOnly],
    queryFn: () => feedbackApi.list({ ...monthBounds(period), maxRating: lowOnly ? 3 : undefined, limit: 50 }),
  });
  const items = data?.data.items ?? [];
  return (
    <Card title="Mijozlar fikri" description="Har bir yakunlangan buyurtmadan keyin SMS orqali so'raladi"
      actions={<label className="flex items-center gap-2 text-sm text-gray-600" data-pdf-hide><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />Faqat past (≤3)</label>}>
      {isLoading ? <Loading /> : items.length === 0 ? <Empty icon={MessageSquare} text="Bu oy baho qoldirilmagan" /> : (
        <div className="divide-y divide-gray-100">
          {items.map((f) => (
            <div key={f.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{f.client.name} · <Link to={`/orders/${f.order.id}`} className="text-brand-700 hover:underline">{f.order.number}</Link></p>
                {f.comment && <p className="mt-0.5 text-sm text-gray-700">“{f.comment}”</p>}
                <p className="mt-1 text-xs text-gray-500">
                  {[f.quality && `sifat ${f.quality}`, f.speed && `tezlik ${f.speed}`, f.service && `muomala ${f.service}`,
                    f.recommend != null && (f.recommend ? 'tavsiya qiladi' : 'tavsiya qilmaydi'),
                    f.heardFrom && HEARD_FROM_LABELS[f.heardFrom], f.byStaffId && 'xodim kiritgan'].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="shrink-0 text-right"><Stars value={f.rating} /><p className="text-xs text-gray-400">{formatDate(f.createdAt)}</p></div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function ClientsAnalyticsPage() {
  const [period, setPeriod] = React.useState(currentPeriod());
  const pdf = usePdfExport(`mijozlar-statistikasi_${period}`);
  const { data: d, isLoading, error, refetch } = useQuery({ queryKey: ['analytics', 'clients', period], queryFn: () => analyticsApi.clients(period) });

  return (
    <div ref={pdf.ref} className="space-y-6 bg-gray-50">
      <PageHeader title="Mijozlar statistikasi" subtitle={`Nechta mijoz keldi, qayerdan va nima qilsak ko'proq keladi · ${periodLabel(period)}`}
        actions={<div className="flex flex-wrap gap-2" data-pdf-hide><MonthInput value={period} onChange={setPeriod} />{pdf.button}</div>} />
      {isLoading ? <Loading rows={8} /> : error || !d ? <ErrorState error={error} onRetry={refetch} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat tone="brand" label="Yangi mijozlar" value={d.newClients} hint={<Delta now={d.newClients} prev={d.prevNewClients} />} />
            <Stat label="Buyurtma bergan mijozlar" value={d.activeClients} hint={`${d.returningClients} tasi qayta kelgan`} />
            <Stat label="Buyurtmalar" value={d.ordersCount} hint={`O'rtacha chek: ${formatCurrency(d.avgCheck)}`} />
            <Stat label="O'rtacha baho" value={d.feedback.avgRating == null ? '—' : <span className="flex items-center gap-2">{d.feedback.avgRating}<Stars value={d.feedback.avgRating} /></span>}
              hint={`${d.feedback.count} ta baho${d.feedback.recommendPercent != null ? ` · ${d.feedback.recommendPercent}% tavsiya qiladi` : ''}`} />
          </div>

          <Card title="Nima qilsak ko'proq mijoz keladi" description="Shu oy raqamlari asosida avtomatik tavsiyalar">
            <Insights items={d.insights} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <Card title="Oxirgi 6 oy">
              <MonthlyBars money={false} data={d.trend.map((t) => ({ ...t, label: periodShort(t.period) }))} series={[
                { key: 'newClients', name: 'Yangi mijozlar', color: C.yellow },
                { key: 'orders', name: 'Buyurtmalar', color: C.ink, type: 'line' },
              ]} />
            </Card>
            <Card title="Buyurtmalar qayerdan keldi">
              {d.ordersBySource.length
                ? <Donut money={false} data={d.ordersBySource.map((s) => ({ name: SOURCE_LABELS[s.source], value: s.count }))} />
                : <Empty text="Bu oy buyurtma yo'q" />}
            </Card>
            <Card title="Mijoz turlari bo'yicha tushum">
              {d.byClientType.length
                ? <HorizontalBars data={d.byClientType.map((t) => ({ name: CLIENT_TYPE_LABELS[t.type], value: t.amount }))} />
                : <Empty text="Ma'lumot yo'q" />}
            </Card>
            <Card title="Bizni qayerdan bilishgan" description="So'rovnoma javoblari">
              {d.feedback.heardFrom.length
                ? <HorizontalBars money={false} data={d.feedback.heardFrom.map((h) => ({ name: HEARD_FROM_LABELS[h.source] ?? h.source, value: h.count }))} />
                : <Empty text="Hali javob yo'q" />}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            <Card title="Baholar taqsimoti">
              <div className="space-y-2">
                {[...d.feedback.distribution].reverse().map((x) => {
                  const max = Math.max(1, ...d.feedback.distribution.map((y) => y.count));
                  return (
                    <div key={x.score} className="flex items-center gap-3 text-sm">
                      <span className="w-6 font-semibold">{x.score}★</span>
                      <div className="h-2.5 flex-1 rounded-full bg-gray-100"><div className="h-2.5 rounded-full bg-brand-400" style={{ width: `${(x.count / max) * 100}%` }} /></div>
                      <span className="w-6 text-right tabular-nums text-gray-600">{x.count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-center text-sm">
                {([['Sifat', d.feedback.avgQuality], ['Tezlik', d.feedback.avgSpeed], ['Muomala', d.feedback.avgService]] as const).map(([l, v]) => (
                  <div key={l}><p className="text-xs text-gray-500">{l}</p><p className="font-display text-lg font-bold">{v ?? '—'}</p></div>
                ))}
              </div>
            </Card>
            <Card title="Saytdan arizalar" className="lg:col-span-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Tushgan</p><p className="font-display text-2xl font-bold">{d.leads.total}</p></div>
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Mijozga aylandi</p><p className="font-display text-2xl font-bold">{d.leads.converted}</p></div>
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Konversiya</p><p className="font-display text-2xl font-bold">{d.leads.total ? Math.round((d.leads.converted / d.leads.total) * 100) : 0}%</p></div>
              </div>
              {d.newClientsBySource.length > 0 && (
                <p className="mt-4 text-sm text-gray-600">Yangi mijozlar manbasi: {d.newClientsBySource.map((s) => `${SOURCE_LABELS[s.source]} — ${s.count}`).join(', ')}</p>
              )}
            </Card>
          </div>

          <FeedbackList period={period} />
        </>
      )}
    </div>
  );
}
