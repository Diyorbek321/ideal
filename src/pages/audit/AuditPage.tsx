import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, History, Search } from 'lucide-react';
import { auditApi, usersApi } from '@/api';
import type { AuditLogEntry } from '@/types';
import { ROLE_LABELS } from '@/lib/labels';
import { cn, formatDateTime } from '@/lib/utils';
import { useDebounced } from '@/components/clients/ClientPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';

const ENTITY_LABELS: Record<string, string> = {
  order: 'Buyurtma', payment: 'To\'lov', client: 'Mijoz', campaign: 'LED reklama', adScreen: 'LED ekran', expense: 'Xarajat',
  user: 'Xodim', design: 'Dizayn', installation: 'Montaj', installProblem: 'Montaj muammosi', productionTask: 'Ishlab chiqarish',
  equipment: 'Uskuna', material: 'Material', stock: 'Ombor', payrollEntry: 'Oylik', payrollTx: 'Oylik yozuvi', absence: 'Sababli kun',
  settings: 'Sozlamalar', price: 'Narx', productType: 'Mahsulot turi', file: 'Fayl', lead: 'Ariza', sms: 'SMS',
  attendance: 'Davomat', feedback: 'Mijoz bahosi', auth: 'Kirish', telegram: 'Telegram',
};

// Ko'p uchraydigan maydonlar o'zbekcha; qolganlari asl nomi bilan
const FIELD_LABELS: Record<string, string> = {
  amount: 'Summa', method: 'To\'lov usuli', kind: 'Turi', note: 'Izoh', notes: 'Izoh', status: 'Holat', name: 'Nomi', fullName: 'Ism',
  phone: 'Telefon', phones: 'Telefonlar', role: 'Rol', isActive: 'Faol', isArchived: 'Arxivda', salary: 'Oylik', totalAmount: 'Jami summa',
  paidAmount: 'To\'langan', discount: 'Chegirma', deadline: 'Muddat', dueDate: 'To\'lov muddati', items: 'Mahsulotlar', designerId: 'Dizayner',
  address: 'Manzil', scheduledAt: 'Sana', team: 'Jamoa', price: 'Narx', costPrice: 'Tannarx', pricePerM2: '1 m² narxi', minStock: 'Minimal qoldiq',
  purchasePrice: 'Xarid narxi', category: 'Kategoriya', latePenalty: 'Kechikish jarimasi', lateGraceMin: 'Jarimasiz daqiqa',
  workStartTime: 'Ish boshlanishi', selfiePercent: 'Selfi %', stock: 'Qoldiq', endDate: 'Tugash sanasi', startDate: 'Boshlanish sanasi',
  slots: 'Slotlar', pricePerDay: 'Kunlik narx', installationAddress: 'Montaj manzili', needsDesign: 'Dizayn kerak', needsInstallation: 'Montaj kerak',
};

const ENTITY_LINK: Record<string, (id: string) => string> = {
  order: (id) => `/orders/${id}`,
  client: (id) => `/clients/${id}`,
  campaign: (id) => `/ad-screens?tab=campaigns&open=${id}`,
};

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'ha' : 'yo\'q';
  if (typeof v === 'number') return v.toLocaleString('ru-RU').replace(/,/g, ' ');
  if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}T/.test(v) ? formatDateTime(v) : v;
  if (Array.isArray(v) && v.every((x) => typeof x === 'object' && x && 'fullName' in x)) return v.map((x) => (x as { fullName: string }).fullName).join(', ');
  const text = JSON.stringify(v);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

function Who({ r }: { r: AuditLogEntry }) {
  if (!r.userName) return <span className="italic text-gray-500">{r.actor ?? 'Tizim'}</span>;
  return (
    <span>
      <span className="font-medium text-gray-900">{r.userName}</span>
      {r.userRole && <span className="block text-xs text-gray-500">{ROLE_LABELS[r.userRole]}</span>}
    </span>
  );
}

function Row({ r }: { r: AuditLogEntry }) {
  const [open, setOpen] = React.useState(false);
  const changes = Object.entries(r.changes ?? {});
  const link = r.entity && r.entityId ? ENTITY_LINK[r.entity]?.(r.entityId) : undefined;
  const hasDetails = changes.length > 0 || r.data != null;
  return (
    <li className="px-5 py-3 sm:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
        <span className="w-32 shrink-0 text-xs tabular-nums text-gray-500">{formatDateTime(r.createdAt)}</span>
        <span className="w-44 shrink-0 text-sm"><Who r={r} /></span>
        <div className="min-w-0 flex-1 text-sm">
          <p className={cn('font-medium', r.status >= 400 ? 'text-red-600' : 'text-gray-900')}>
            {r.action}
            {r.entity && <span className="ml-2 text-xs font-normal text-gray-500">{ENTITY_LABELS[r.entity] ?? r.entity}</span>}
            {link && <Link to={link} className="ml-2 text-xs font-semibold text-brand-700 hover:underline">ochish</Link>}
          </p>
          {/* Asosiy o'zgarishlar darhol ko'rinadi */}
          {changes.slice(0, 3).map(([k, c]) => (
            <p key={k} className="text-xs text-gray-600">
              {FIELD_LABELS[k] ?? k}: <span className="text-red-700 line-through decoration-red-300">{show(c.from)}</span> → <b className="text-gray-900">{show(c.to)}</b>
            </p>
          ))}
          {hasDetails && (
            <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
              <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />{open ? 'Yopish' : 'Batafsil'}
            </button>
          )}
          {open && (
            <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-3 text-xs">
              {changes.length > 3 && changes.slice(3).map(([k, c]) => (
                <p key={k}>{FIELD_LABELS[k] ?? k}: <span className="text-red-700">{show(c.from)}</span> → <b>{show(c.to)}</b></p>
              ))}
              {r.data != null && (
                <>
                  <p className="font-semibold text-gray-700">{r.method === 'DELETE' ? 'O\'chirilgan ma\'lumot' : 'Yuborilgan ma\'lumot'}</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-gray-600">{JSON.stringify(r.data, null, 2)}</pre>
                </>
              )}
              <p className="text-gray-400">{r.method} {r.route}{r.ip && ` · IP ${r.ip}`}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** Kim, qachon, nima qildi — direktor uchun */
export default function AuditPage() {
  const [params, setParams] = useSearchParams();
  const refId = params.get('ref') ?? '';
  const [userId, setUserId] = React.useState('');
  const [entity, setEntity] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [search, setSearch] = React.useState('');
  const q = useDebounced(search);
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setPage(1), [userId, entity, from, to, q, refId]);

  const { data: users } = useQuery({ queryKey: ['users', 'all'], queryFn: () => usersApi.list() });
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['audit', userId, entity, from, to, q, refId, page],
    queryFn: () => auditApi.list({
      userId: userId || undefined, entity: entity || undefined, refId: refId || undefined, search: q || undefined,
      // "gacha" sanasi ham kiradi
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(new Date(`${to}T00:00:00`).getTime() + 86_400_000).toISOString() : undefined,
      page, limit: 50,
    }),
    placeholderData: keepPreviousData,
  });
  const pages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader title="Harakatlar jurnali" subtitle="Tizimda kim, qachon, nima qildi. Yozuvlarni o'zgartirib yoki o'chirib bo'lmaydi" />

      {refId && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-100 px-4 py-3 text-sm text-gray-900">
          <span>Faqat bitta obyekt bilan bog'liq yozuvlar ko'rsatilmoqda</span>
          <button type="button" className="font-semibold hover:underline" onClick={() => setParams({})}>Hammasini ko'rsatish</button>
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-gray-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Qidirish..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Barcha xodimlar"
            options={(users ?? []).map((u) => ({ value: u.id, label: u.fullName }))} />
          <Select value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="Barcha bo'limlar"
            options={Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label }))} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Sanadan" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sanagacha" />
        </div>
        {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading || !data ? <Loading rows={8} /> : data.data.length === 0 ? (
          <Empty icon={History} text="Yozuv topilmadi" />
        ) : (
          <ul className={cn('divide-y divide-gray-50', isFetching && 'opacity-60')}>
            {data.data.map((r) => <Row key={r.id} r={r} />)}
          </ul>
        )}
        {data && pages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t border-gray-100 p-4">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Oldingi</Button>
            <span className="text-sm text-gray-600">{page} / {pages} · jami {data.meta.total}</span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Keyingi</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
