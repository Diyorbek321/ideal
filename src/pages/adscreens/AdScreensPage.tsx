import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MapPin, MonitorPlay, Pencil, Plus, Search } from 'lucide-react';
import { adScreensApi } from '@/api';
import type { AdCampaignView, AdScreen } from '@/types';
import { AD_PHASE_LABELS } from '@/lib/labels';
import { cn, fileUrl, formatCurrency, formatDate } from '@/lib/utils';
import { useDebounced } from '@/components/clients/ClientPicker';
import { CampaignDetailModal, PHASE_BADGE } from '@/components/adscreens/CampaignDetailModal';
import { CampaignFormModal } from '@/components/adscreens/CampaignFormModal';
import { OccupancyStrip } from '@/components/adscreens/OccupancyStrip';
import { ScreenFormModal } from '@/components/adscreens/ScreenFormModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';

const VIEWS: Array<{ value: AdCampaignView; label: string }> = [
  { value: 'active', label: 'Efirda' },
  { value: 'upcoming', label: 'Kelgusi' },
  { value: 'booked', label: 'Bron' },
  { value: 'debt', label: 'Qarzdor' },
  { value: 'finished', label: 'Tugagan' },
  { value: 'cancelled', label: 'Bekor' },
  { value: 'all', label: 'Hammasi' },
];

const pill = (on: boolean) => cn('flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors',
  on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400');

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-gray-900">{value}</p>
    </Card>
  );
}

function ScreenCard({ s, onEdit, onBook }: { s: AdScreen; onEdit: () => void; onBook: () => void }) {
  const pct = Math.round((s.usedToday / s.maxSlots) * 100);
  return (
    <Card className={cn('flex flex-col overflow-hidden', !s.isActive && 'opacity-60')}>
      {s.photoUrl
        ? <img src={fileUrl(s.photoUrl)} alt={s.name} className="h-36 w-full object-cover" />
        : <div className="flex h-36 items-center justify-center bg-gray-900 text-brand-400"><MonitorPlay className="h-10 w-10" /></div>}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{s.name}</p>
            <p className="flex items-center gap-1 truncate text-sm text-gray-500"><MapPin className="h-3.5 w-3.5 shrink-0" />{s.address}</p>
          </div>
          <button onClick={onEdit} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Tahrirlash"><Pencil className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-gray-500">
          {s.widthM}×{s.heightM} m{s.resolution ? ` · ${s.resolution}` : ''} · {s.slotSeconds} s rolik · {s.workFrom}–{s.workTo}
        </p>
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Bugun band</span>
            <b className="tabular-nums">{s.usedToday}/{s.maxSlots} <span className="font-normal text-gray-500">({pct}%)</span></b>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-brand-400" style={{ width: `${pct}%` }} /></div>
        </div>
        <OccupancyStrip screenId={s.id} days={30} />
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <span className="text-sm"><b>{formatCurrency(s.pricePerDay)}</b><span className="text-gray-500"> / kun</span></span>
          {s.isActive && <Button size="sm" onClick={onBook} disabled={s.freeNext30 === 0 && s.freeToday === 0}><Plus className="h-4 w-4" />Bron</Button>}
        </div>
      </div>
    </Card>
  );
}

export default function AdScreensPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'campaigns' ? 'campaigns' : 'screens';
  const view = (params.get('view') ?? 'active') as AdCampaignView;
  const openId = params.get('open');
  const [search, setSearch] = React.useState('');
  const debounced = useDebounced(search);
  const [editing, setEditing] = React.useState<AdScreen | null | 'new'>(null);
  const [booking, setBooking] = React.useState<{ screenId?: string } | null>(null);

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  const overview = useQuery({ queryKey: ['ad-screens', 'overview'], queryFn: adScreensApi.overview });
  const campaigns = useQuery({
    queryKey: ['ad-screens', 'campaigns', view, debounced],
    queryFn: () => adScreensApi.campaigns({ view, search: debounced || undefined, limit: 100 }),
    placeholderData: keepPreviousData,
    enabled: tab === 'campaigns',
  });
  const screens = overview.data?.items ?? [];
  const summary = overview.data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader title="LED ekranlar" subtitle="Ko'chadagi ekranlarimizda reklama vaqtini sotish: bandlik, bronlar va to'lovlar"
        actions={<>
          <Button variant="outline" onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Ekran</Button>
          <Button onClick={() => setBooking({})} disabled={!screens.some((s) => s.isActive)}><Plus className="h-4 w-4" />Yangi reklama</Button>
        </>} />

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Faol ekranlar" value={String(summary.screens)} />
          <Stat label="Hozir efirda" value={String(summary.activeCampaigns)} />
          <Stat label="Bugungi bandlik" value={`${summary.occupancyPct}%`} />
          <Stat label="Mijozlar qarzi" value={formatCurrency(summary.debt)} />
        </div>
      )}

      <div className="flex gap-2">
        <button className={pill(tab === 'screens')} onClick={() => setParam({ tab: null })}>Ekranlar</button>
        <button className={pill(tab === 'campaigns')} onClick={() => setParam({ tab: 'campaigns' })}>Reklamalar</button>
      </div>

      {tab === 'screens' ? (
        overview.error ? <ErrorState error={overview.error} onRetry={overview.refetch} /> : overview.isLoading ? <Loading rows={4} /> : screens.length === 0 ? (
          <Card><Empty icon={MonitorPlay} text="Hali ekran qo'shilmagan — “Ekran” tugmasini bosing" /></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {screens.map((s) => <ScreenCard key={s.id} s={s} onEdit={() => setEditing(s)} onBook={() => setBooking({ screenId: s.id })} />)}
          </div>
        )
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0">
              {VIEWS.map((v) => <button key={v.value} className={pill(view === v.value)} onClick={() => setParam({ view: v.value === 'active' ? null : v.value })}>{v.label}</button>)}
            </div>
            <div className="relative md:ml-auto md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Mijoz, nom yoki raqam..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {campaigns.error ? <ErrorState error={campaigns.error} onRetry={campaigns.refetch} /> : campaigns.isLoading ? <Loading rows={6} /> : !campaigns.data?.data.length ? (
            <Card><Empty icon={MonitorPlay} text="Reklamalar topilmadi" /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Reklama</th><th className="px-4 py-3">Ekran</th><th className="px-4 py-3">Davr</th>
                      <th className="px-4 py-3">Holat</th><th className="px-4 py-3 text-right">Summa</th><th className="px-4 py-3 text-right">Qoldiq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {campaigns.data.data.map((c) => (
                      <tr key={c.id} onClick={() => setParam({ open: c.id })} className="cursor-pointer hover:bg-gray-50">
                        <td className="px-4 py-3"><p className="font-semibold text-gray-900">{c.client.name}</p><p className="text-xs text-gray-500">{c.number} · {c.title}</p></td>
                        <td className="px-4 py-3 text-gray-700">{c.screen.name}<p className="text-xs text-gray-500">{c.slots} slot</p></td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(c.startDate)} – {formatDate(c.endDate)}
                          {c.phase === 'EFIRDA' && <p className={cn('text-xs', c.daysLeft <= 3 ? 'font-semibold text-red-600' : 'text-gray-500')}>yana {c.daysLeft} kun</p>}
                        </td>
                        <td className="px-4 py-3"><Badge variant={PHASE_BADGE[c.phase]}>{AD_PHASE_LABELS[c.phase]}</Badge></td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.totalAmount)}</td>
                        <td className={cn('px-4 py-3 text-right tabular-nums', c.remaining > 0 && c.status !== 'BEKOR' ? 'font-semibold text-red-600' : 'text-gray-400')}>
                          {c.status === 'BEKOR' ? '—' : formatCurrency(c.remaining)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {editing && <ScreenFormModal screen={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {booking && (
        <CampaignFormModal screens={screens} initialScreenId={booking.screenId} onClose={() => setBooking(null)}
          onCreated={(c) => { setBooking(null); setParam({ tab: 'campaigns', view: c.status === 'BRON' ? 'booked' : null, open: c.id }); }} />
      )}
      {openId && <CampaignDetailModal id={openId} onClose={() => setParam({ open: null })} />}
    </div>
  );
}
