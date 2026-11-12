import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Archive, Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { ordersApi } from '@/api';
import { CLIENT_TYPE_LABELS, SOURCE_LABELS, STATUS_LABELS, options } from '@/lib/labels';
import { cn, formatCurrency, formatDate, formatHours } from '@/lib/utils';
import { useUser } from '@/lib/auth';
import { useDebounced } from '@/components/clients/ClientPicker';
import { OrderFormModal } from '@/components/orders/OrderFormModal';
import { OrdersKanban } from '@/components/orders/OrdersKanban';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 25;
const FINISHED = new Set(['YAKUNLANDI', 'BEKOR_QILINDI']);

export default function OrdersPage() {
  const navigate = useNavigate();
  const me = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  // Direktor eski buyurtmalarni belgilab, birdaniga o'chiradi
  const canBulkDelete = me.role === 'ADMIN' || me.role === 'MANAGER';
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [creating, setCreating] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [search, setSearch] = React.useState(params.get('search') ?? '');
  const debounced = useDebounced(search);

  const view = (params.get('view') as 'table' | 'kanban') ?? 'table';
  const page = Number(params.get('page') ?? 1);
  // Yakunlangan va bekor qilingan buyurtmalar "Arxiv"da; kanban faqat faollarni ko'rsatadi
  const archived = view === 'table' && params.get('archive') === '1';
  const filters = {
    archive: (archived ? 'only' : 'exclude') as 'only' | 'exclude',
    status: params.get('status') ?? undefined,
    source: params.get('source') ?? undefined,
    clientType: params.get('clientType') ?? undefined,
    debtOnly: params.get('debtOnly') === 'true' || undefined,
    overdueOnly: params.get('overdueOnly') === 'true' || undefined,
  };

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  React.useEffect(() => {
    if ((params.get('search') ?? '') !== debounced) setParam('search', debounced || null);
  }, [debounced]);

  // Yuqori paneldagi qidiruv URL'ni o'zgartirganda maydon ham yangilanadi
  const urlSearch = params.get('search') ?? '';
  React.useEffect(() => {
    if (urlSearch !== search && urlSearch !== debounced) setSearch(urlSearch);
  }, [urlSearch]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', view, page, filters, debounced],
    queryFn: () => ordersApi.list({ ...filters, search: debounced || undefined, view, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const activeFilters = [filters.status, filters.source, filters.clientType, filters.debtOnly, filters.overdueOnly].filter(Boolean).length;
  const statusOptions = options(STATUS_LABELS).filter((o) => FINISHED.has(o.value) === archived);
  const setArchived = (on: boolean) => {
    const next = new URLSearchParams(params);
    if (on) next.set('archive', '1'); else next.delete('archive');
    next.delete('status');
    next.delete('page');
    setParams(next, { replace: true });
  };
  const orders = data?.data ?? [];

  React.useEffect(() => { setSelected(new Set()); }, [params.toString()]);
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  const bulkRemove = useMutation({
    mutationFn: () => ordersApi.bulkRemove([...selected]),
    onSuccess: (r) => {
      if (r.failed.length) toast.error(`${r.deleted} ta o'chirildi, ${r.failed.length} tasi o'chmadi: ${r.failed[0].error}`);
      else toast.success(`${r.deleted} ta buyurtma o'chirildi`);
      setSelected(new Set());
      for (const key of ['orders', 'summary', 'payments', 'debts']) void qc.invalidateQueries({ queryKey: [key] });
    },
    onError: toast.error,
  });
  const confirmBulkRemove = () => {
    const picked = orders.filter((o) => selected.has(o.id));
    const paid = picked.reduce((sum, o) => sum + (o.paidAmount ?? 0), 0);
    const money = paid > 0 && me.role !== 'ADMIN'
      ? '\n\nTo\'lovi bor buyurtmalar o\'chmaydi — ularni faqat admin o\'chira oladi.'
      : paid > 0 ? `\n\nUlarda ${formatCurrency(paid)} to'lov bor — to'lovlar ham o'chadi va kassa hisobotidan chiqadi (balansdan to'langani mijoz balansiga qaytadi).` : '';
    if (window.confirm(`${picked.length} ta buyurtmani butunlay o'chirasizmi? Dizayn, ishlab chiqarish va o'rnatish ham o'chadi. Qaytarib bo'lmaydi.${money}`)) bulkRemove.mutate();
  };
  const meta = data?.meta;
  const pages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyurtmalar"
        subtitle={meta ? `Jami: ${meta.total}` : 'Barcha buyurtmalar ro\'yxati va holati'}
        actions={(
          <>
            <div className="flex rounded-xl border border-gray-200 bg-white p-1">
              {(['table', 'kanban'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    if (v === 'kanban') { next.set('view', 'kanban'); next.delete('status'); next.delete('archive'); } else next.delete('view');
                    next.delete('page');
                    setParams(next, { replace: true });
                  }}
                  className={cn('rounded-lg p-1.5 transition-colors', view === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100')}
                  aria-label={v === 'table' ? 'Jadval' : 'Kanban'}
                >
                  {v === 'table' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                </button>
              ))}
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Yangi buyurtma
            </Button>
          </>
        )}
      />

      {view === 'table' && (
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 sm:w-fit" role="tablist">
          {([[false, 'Faol buyurtmalar'], [true, 'Arxiv']] as const).map(([on, label]) => (
            <button key={label} type="button" role="tab" aria-selected={archived === on} onClick={() => setArchived(on)}
              className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none',
                archived === on ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100')}>
              {on && <Archive className="h-4 w-4" />}{label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="flex gap-2 md:col-span-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Raqam, mijoz yoki telefon..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="h-11 md:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && <span className="rounded-full bg-brand-400 px-1.5 text-xs text-white">{activeFilters}</span>}
          </Button>
        </div>
        <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-4 md:grid-cols-4', !filtersOpen && 'hidden md:grid')}>
        {view === 'table' && (
          <Select value={filters.status ?? ''} onChange={(e) => setParam('status', e.target.value)} placeholder="Barcha statuslar" options={statusOptions} />
        )}
        <Select value={filters.source ?? ''} onChange={(e) => setParam('source', e.target.value)} placeholder="Barcha manbalar" options={options(SOURCE_LABELS)} />
        <Select value={filters.clientType ?? ''} onChange={(e) => setParam('clientType', e.target.value)} placeholder="Mijoz turi" options={options(CLIENT_TYPE_LABELS)} />
        <div className="flex items-center gap-2 text-sm">
          {([['debtOnly', 'Qarzi bor'], ['overdueOnly', 'Kechikkan']] as const).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={!!filters[k]} onClick={() => setParam(k, filters[k] ? null : 'true')}
              className={cn('h-10 flex-1 rounded-xl border px-3 font-medium transition-colors md:flex-none',
                filters[k] ? 'border-gray-900 bg-brand-300 text-gray-900' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400')}>
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Loading rows={8} /> : view === 'kanban' ? (
        <OrdersKanban orders={orders} />
      ) : (
        <Card className="overflow-hidden">
          {orders.length === 0 ? (
            <div>
              <Empty text={activeFilters || debounced ? 'Bu filtr bo\'yicha buyurtma topilmadi' : archived ? 'Arxiv bo\'sh — yakunlangan buyurtma yo\'q' : 'Faol buyurtma yo\'q'} />
              {(activeFilters > 0 || debounced) && (
                <div className="-mt-6 pb-8 text-center">
                  <Button variant="outline" size="sm" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>Filtrlarni tozalash</Button>
                </div>
              )}
            </div>
          ) : (<>
            <ul className="divide-y divide-gray-100 md:hidden">
              {orders.map((o) => (
                <li key={o.id}>
                  <button onClick={() => navigate(`/orders/${o.id}`)} className="w-full px-4 py-3.5 text-left active:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500">{o.number}</p>
                        <p className="mt-0.5 truncate font-semibold text-gray-900">{o.client.name}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3 text-sm">
                      <span className={cn('flex items-center gap-1.5', o.isLate ? 'font-semibold text-red-700' : 'text-gray-500')}>
                        <Calendar className="h-3.5 w-3.5" />{formatDate(o.deadline)}
                        {o.sla.isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums text-gray-900">{formatCurrency(o.totalAmount)}</span>
                        {!!o.remainingAmount && <span className="block text-xs font-medium text-red-700">Qarz: {formatCurrency(o.remainingAmount)}</span>}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {canBulkDelete && selected.size > 0 && (
              <div className="hidden items-center justify-between gap-3 border-b border-gray-200 bg-red-50 px-5 py-2.5 text-sm md:flex">
                <span className="font-medium text-gray-900">{selected.size} ta tanlandi</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Bekor</Button>
                  <Button size="sm" variant="danger" isLoading={bulkRemove.isPending} onClick={confirmBulkRemove}>
                    <Trash2 className="h-4 w-4" />O'chirish
                  </Button>
                </div>
              </div>
            )}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {canBulkDelete && (
                      <th className="w-10 pl-5 py-3">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Sahifadagi hammasini tanlash"
                          className="h-4 w-4 rounded border-gray-300 accent-brand-400" />
                      </th>
                    )}
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">ID / Sana</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Mijoz</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Summa</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Muddat</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Dizayner</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className={cn('cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-brand-50', selected.has(o.id) && 'bg-brand-50')}>
                      {canBulkDelete && (
                        <td className="w-10 pl-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} aria-label={`${o.number} ni tanlash`}
                            className="h-4 w-4 rounded border-gray-300 accent-brand-400" />
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900">{o.number}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{o.client.name}</p>
                        <p className="text-xs text-gray-500">{SOURCE_LABELS[o.source]}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</p>
                        {!!o.remainingAmount && <p className="mt-1 text-xs font-medium text-red-700">Qarz: {formatCurrency(o.remainingAmount)}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={o.status} />
                        {o.sla.isOverdue && (
                          <p className="mt-1 flex items-center text-xs font-medium text-red-600">
                            <AlertTriangle className="mr-1 h-3 w-3" /> {formatHours(o.sla.hoursInStatus)}
                          </p>
                        )}
                      </td>
                      <td className={cn('px-5 py-3.5', o.isLate ? 'font-medium text-red-600' : 'text-gray-600')}>
                        <div className="flex items-center"><Calendar className="mr-2 h-4 w-4" />{formatDate(o.deadline)}</div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{o.designer?.fullName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-sm text-gray-600">
              <span>{page} / {pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {creating && <OrderFormModal open onClose={() => setCreating(false)} />}
    </div>
  );
}
