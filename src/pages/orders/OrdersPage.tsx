import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Search } from 'lucide-react';
import { ordersApi } from '@/api';
import { CLIENT_TYPE_LABELS, SOURCE_LABELS, STATUS_LABELS, options } from '@/lib/labels';
import { cn, formatCurrency, formatDate, formatHours } from '@/lib/utils';
import { useDebounced } from '@/components/clients/ClientPicker';
import { OrderFormModal } from '@/components/orders/OrderFormModal';
import { OrdersKanban } from '@/components/orders/OrdersKanban';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';

const LIMIT = 25;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = React.useState(false);
  const [search, setSearch] = React.useState(params.get('search') ?? '');
  const debounced = useDebounced(search);

  const view = (params.get('view') as 'table' | 'kanban') ?? 'table';
  const page = Number(params.get('page') ?? 1);
  const filters = {
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

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const pages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyurtmalar"
        subtitle={meta ? `Jami: ${meta.total}` : 'Barcha buyurtmalar ro\'yxati va holati'}
        actions={(
          <>
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              {(['table', 'kanban'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    if (v === 'kanban') { next.set('view', 'kanban'); next.delete('status'); } else next.delete('view');
                    next.delete('page');
                    setParams(next, { replace: true });
                  }}
                  className={cn('rounded-md p-1.5 transition-colors', view === v ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50')}
                  aria-label={v === 'table' ? 'Jadval' : 'Kanban'}
                >
                  {v === 'table' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                </button>
              ))}
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-5 w-5" /> Yangi buyurtma
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Raqam, mijoz yoki telefon..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {view === 'table' && (
          <Select value={filters.status ?? ''} onChange={(e) => setParam('status', e.target.value)} placeholder="Barcha statuslar" options={options(STATUS_LABELS)} />
        )}
        <Select value={filters.source ?? ''} onChange={(e) => setParam('source', e.target.value)} placeholder="Barcha manbalar" options={options(SOURCE_LABELS)} />
        <Select value={filters.clientType ?? ''} onChange={(e) => setParam('clientType', e.target.value)} placeholder="Mijoz turi" options={options(CLIENT_TYPE_LABELS)} />
        <div className="flex items-center gap-4 text-sm text-gray-700">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!filters.debtOnly} onChange={(e) => setParam('debtOnly', e.target.checked ? 'true' : null)} /> Qarzi bor</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!filters.overdueOnly} onChange={(e) => setParam('overdueOnly', e.target.checked ? 'true' : null)} /> Kechikkan</label>
        </div>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Loading rows={8} /> : view === 'kanban' ? (
        <OrdersKanban orders={orders} />
      ) : (
        <Card className="overflow-hidden">
          {orders.length === 0 ? <Empty text="Buyurtmalar topilmadi" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 font-semibold text-gray-900">ID / Sana</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Mijoz</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Summa</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Muddat</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Dizayner</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-blue-600">{o.number}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{o.client.name}</p>
                        <p className="text-xs text-gray-500">{SOURCE_LABELS[o.source]}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</p>
                        {!!o.remainingAmount && <p className="mt-1 text-xs font-medium text-red-500">Qarz: {formatCurrency(o.remainingAmount)}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={o.status} />
                        {o.sla.isOverdue && (
                          <p className="mt-1 flex items-center text-xs font-medium text-red-600">
                            <AlertTriangle className="mr-1 h-3 w-3" /> {formatHours(o.sla.hoursInStatus)}
                          </p>
                        )}
                      </td>
                      <td className={cn('px-6 py-4', o.isLate ? 'font-medium text-red-600' : 'text-gray-600')}>
                        <div className="flex items-center"><Calendar className="mr-2 h-4 w-4" />{formatDate(o.deadline)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{o.designer?.fullName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
