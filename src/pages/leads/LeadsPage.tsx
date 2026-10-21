import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, MessageSquareText, Phone, Search, UserPlus } from 'lucide-react';
import { clientsApi, leadsApi } from '@/api';
import type { Client, ClientType, Lead, LeadStatus } from '@/types';
import { CLIENT_TYPE_LABELS, LEAD_STATUS_LABELS, options } from '@/lib/labels';
import { cn, formatDateTime, formatPhone } from '@/lib/utils';
import { useDebounced } from '@/components/clients/ClientPicker';
import { OrderFormModal } from '@/components/orders/OrderFormModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const TABS: Array<{ value: LeadStatus | ''; label: string }> = [
  { value: 'NEW', label: 'Yangi' },
  { value: 'CONTACTED', label: 'Bog\'lanildi' },
  { value: 'CONVERTED', label: 'Mijozga aylandi' },
  { value: 'REJECTED', label: 'Rad etildi' },
  { value: '', label: 'Hammasi' },
];

const BADGE: Record<LeadStatus, 'info' | 'warning' | 'success' | 'default'> = {
  NEW: 'info', CONTACTED: 'warning', CONVERTED: 'success', REJECTED: 'default',
};

function LeadDetail({ id, onClose, onOrder }: { id: string; onClose: () => void; onOrder: (client: Client, lead: Lead) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: lead, isLoading, error } = useQuery({ queryKey: ['leads', 'one', id], queryFn: () => leadsApi.get(id) });
  const [note, setNote] = React.useState<string | null>(null);
  const [type, setType] = React.useState<ClientType>('COMPANY');
  const [name, setName] = React.useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['leads'] });
  const update = useMutation({
    mutationFn: (body: Parameters<typeof leadsApi.update>[1]) => leadsApi.update(id, body),
    onSuccess: () => { toast.success('Saqlandi'); void refresh(); },
    onError: toast.error,
  });
  const convert = useMutation({
    mutationFn: () => leadsApi.convert(id, { type, name: name?.trim() || undefined }),
    onSuccess: async (r) => {
      toast.success(r.clientCreated ? 'Yangi mijoz yaratildi' : 'Mavjud mijozga bog\'landi');
      void refresh();
      void qc.invalidateQueries({ queryKey: ['clients'] });
      onOrder(await clientsApi.get(r.clientId), r.lead);
    },
    onError: toast.error,
  });

  const noteValue = note ?? lead?.note ?? '';
  const closed = lead?.status === 'CONVERTED';

  return (
    <Modal open onClose={onClose} title={lead ? lead.name : 'Ariza'} size="lg"
      footer={lead && !closed ? (
        <>
          {lead.status !== 'REJECTED' && <Button variant="ghost" onClick={() => update.mutate({ status: 'REJECTED' })}>Rad etish</Button>}
          {lead.status === 'NEW' && <Button variant="outline" onClick={() => update.mutate({ status: 'CONTACTED' })}>Bog'landim</Button>}
          <Button onClick={() => convert.mutate()} isLoading={convert.isPending}><UserPlus className="h-4 w-4" />Mijoz va buyurtma</Button>
        </>
      ) : undefined}>
      {isLoading ? <Loading rows={3} /> : error || !lead ? <ErrorState error={error} /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={BADGE[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
            <span className="text-sm text-gray-500">{formatDateTime(lead.createdAt)}</span>
            <a href={`tel:${lead.phone}`} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
              <Phone className="h-4 w-4" />{formatPhone(lead.phone)}
            </a>
          </div>
          {lead.service && <p className="text-sm"><span className="text-gray-500">Xizmat: </span><b>{lead.service}</b></p>}
          {lead.message && <p className="whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm text-gray-800">{lead.message}</p>}
          {lead.details && (
            <details className="rounded-xl border border-gray-200 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">Saytda tanlagani (konstruktor/kalkulyator)</summary>
              <p className="mt-2 whitespace-pre-line text-gray-600">{lead.details}</p>
            </details>
          )}
          {lead.existingClient && !closed && (
            <p className="rounded-xl bg-brand-100 p-3 text-sm text-brand-800">
              Bu raqam mijozlar bazasida bor: <b>{lead.existingClient.name}</b>. Aylantirsangiz, yangi mijoz yaratilmaydi — shunga bog'lanadi.
            </p>
          )}
          {closed && lead.client && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Mijoz: <b>{lead.client.name}</b></p>}

          <div className="space-y-2">
            <Textarea label="Menejer izohi" value={noteValue} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: ertaga o'lchovga boramiz" />
            {note !== null && note !== (lead.note ?? '') && (
              <Button size="sm" variant="outline" onClick={() => update.mutate({ note: note.trim() || null })}>Izohni saqlash</Button>
            )}
          </div>

          {!closed && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-3 sm:grid-cols-2">
              <p className="text-sm font-medium text-gray-700 sm:col-span-2">Mijozga aylantirish</p>
              <Input label="Mijoz nomi" value={name ?? lead.name} onChange={(e) => setName(e.target.value)} />
              <Select label="Mijoz turi" value={type} onChange={(e) => setType(e.target.value as ClientType)} options={options(CLIENT_TYPE_LABELS)} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function LeadsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = React.useState('');
  const debounced = useDebounced(search);
  const status = (params.get('status') ?? 'NEW') as LeadStatus | '';
  const openId = params.get('open');
  const [ordering, setOrdering] = React.useState<{ client: Client; lead: Lead } | null>(null);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v === null) next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leads', status, debounced],
    queryFn: () => leadsApi.list({ status: status || undefined, search: debounced || undefined, limit: 50 }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const { data: count } = useQuery({ queryKey: ['leads', 'count'], queryFn: leadsApi.count, refetchInterval: 30_000 });
  const leads = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Saytdan arizalar" subtitle="ideal-dizayn.uz formasidan kelgan so'rovlar — har biriga tez qo'ng'iroq qiling" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0">
          {TABS.map((t) => (
            <button key={t.label} onClick={() => setParam('status', t.value === 'NEW' ? null : t.value)}
              className={cn('flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors',
                status === t.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')}>
              {t.label}
              {t.value === 'NEW' && !!count?.new && <span className="rounded-full bg-brand-400 px-1.5 text-xs font-bold text-gray-900">{count.new}</span>}
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Ism, telefon yoki matn..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Loading rows={6} /> : leads.length === 0 ? (
        <Card><Empty icon={Globe} text={status === 'NEW' ? 'Yangi ariza yo\'q — hammasiga javob berilgan' : 'Arizalar topilmadi'} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((l) => (
            <Card key={l.id} className={cn('flex flex-col gap-3 p-4 transition-colors hover:border-gray-900', l.status === 'NEW' && 'border-brand-300 bg-brand-50/40')}>
              <button className="text-left" onClick={() => setParam('open', l.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{l.name}</p>
                    <p className="text-sm tabular-nums text-gray-500">{formatPhone(l.phone)}</p>
                  </div>
                  <Badge variant={BADGE[l.status]}>{LEAD_STATUS_LABELS[l.status]}</Badge>
                </div>
                {l.service && <p className="mt-2 text-sm font-medium text-gray-800">{l.service}</p>}
                {l.message && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{l.message}</p>}
                {l.note && <p className="mt-2 flex items-start gap-1.5 text-xs text-brand-800"><MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />{l.note}</p>}
              </button>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <span className="text-xs text-gray-500">{formatDateTime(l.createdAt)}</span>
                <a href={`tel:${l.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gray-900 px-3 text-sm font-semibold text-white hover:bg-gray-700">
                  <Phone className="h-4 w-4" />Qo'ng'iroq
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {openId && (
        <LeadDetail id={openId} onClose={() => setParam('open', null)}
          onOrder={(client, lead) => { setParam('open', null); setOrdering({ client, lead }); }} />
      )}
      {ordering && (
        <OrderFormModal open onClose={() => setOrdering(null)} initialClient={ordering.client} initialSource="WEBSITE"
          initialNotes={[ordering.lead.service, ordering.lead.message].filter(Boolean).join('\n')} />
      )}
    </div>
  );
}

