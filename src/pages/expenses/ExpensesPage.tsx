import React from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Banknote, CreditCard, Landmark, Plus, Receipt, Search, X } from 'lucide-react';
import { expensesApi } from '@/api';
import type { Expense, PaymentMethod } from '@/types';
import { METHOD_LABELS } from '@/lib/labels';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useDebounced } from '@/components/clients/ClientPicker';
import { EXPENSE_METHODS, ExpenseFormModal } from '@/components/finance/ExpenseFormModal';
import { ExpenseCharts } from '@/components/finance/FinanceCharts';
import { MonthInput, periodLabel, usePdfExport } from '@/components/reports/ReportToolbar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';

const PAGE_SIZE = 50;
const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = { CASH: Banknote, CARD: CreditCard, TRANSFER: Landmark, TENDER: Landmark };

function monthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return { from: new Date(y, m - 1, 1).toISOString(), to: new Date(y, m, 1).toISOString() };
}
function prevMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ExpensesPage() {
  const now = new Date();
  const [month, setMonth] = React.useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [category, setCategory] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod | ''>('');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const q = useDebounced(search);
  const pdf = usePdfExport(`xarajatlar_${month}`);
  const range = monthBounds(month);

  React.useEffect(() => setPage(1), [month, category, method, q]);

  // Oy bo'yicha umumiy ko'rinish filtrlarsiz — kategoriya ulushlari doim to'liq oyni ko'rsatadi
  const overview = useQuery({ queryKey: ['expenses', 'overview', month], queryFn: () => expensesApi.list({ ...range, limit: 1 }) });
  const previous = useQuery({
    queryKey: ['expenses', 'overview', prevMonth(month)],
    queryFn: () => expensesApi.list({ ...monthBounds(prevMonth(month)), limit: 1 }),
  });
  const list = useQuery({
    queryKey: ['expenses', 'list', month, category, method, q, page],
    queryFn: () => expensesApi.list({ ...range, category: category || undefined, method: method || undefined, q: q || undefined, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const total = overview.data?.data.totalAmount ?? 0;
  const prevTotal = previous.data?.data.totalAmount ?? 0;
  const diff = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const byCategory = overview.data?.data.byCategory ?? [];
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.amount));
  const items = list.data?.data.items ?? [];
  const pages = Math.max(1, Math.ceil((list.data?.meta.total ?? 0) / PAGE_SIZE));
  const filtered = !!(category || method || q);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setFormOpen(true); };
  const resetFilters = () => { setCategory(''); setMethod(''); setSearch(''); };

  return (
    <div ref={pdf.ref} className="space-y-6 bg-gray-50">
      <PageHeader
        title="Xarajatlar"
        subtitle={`Har bir sarflangan so'm — kim, qachon, nimaga va qanday to'langani · ${periodLabel(month)}`}
        actions={(
          <div className="flex flex-wrap gap-2 sm:gap-3" data-pdf-hide>
            <MonthInput value={month} onChange={setMonth} />
            {pdf.button}
            <Button onClick={openNew}><Plus className="h-4 w-4" />Xarajat qo'shish</Button>
          </div>
        )}
      />

      {overview.error ? <ErrorState error={overview.error} onRetry={overview.refetch} /> : overview.isLoading ? <Loading rows={3} /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-6">
            <p className="text-sm text-gray-500">Oy bo'yicha jami</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">{formatCurrency(total)}</p>
            {diff !== null && (
              <p className={cn('mt-2 text-sm font-semibold', diff > 0 ? 'text-red-600' : 'text-emerald-600')}>
                O'tgan oyga nisbatan {diff > 0 ? '+' : ''}{diff}%
              </p>
            )}
            <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
              {EXPENSE_METHODS.map((m) => {
                const Icon = METHOD_ICONS[m];
                const amount = overview.data?.data.byMethod.find((x) => x.method === m)?.amount ?? 0;
                return (
                  <button key={m} onClick={() => setMethod(method === m ? '' : m)}
                    className={cn('flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-50', method === m && 'bg-brand-100')}>
                    <span className="flex items-center gap-2 text-gray-600"><Icon className="h-4 w-4" />{METHOD_LABELS[m]}</span>
                    <b className="tabular-nums text-gray-900">{formatCurrency(amount)}</b>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Nimaga ketdi" description="Bosing — shu kategoriya bo'yicha filtrlanadi" className="lg:col-span-2">
            {byCategory.length ? (
              <div className="space-y-2">
                {byCategory.map((c) => (
                  <button key={c.category} onClick={() => setCategory(category === c.category ? '' : c.category)}
                    className={cn('block w-full rounded-lg p-1.5 text-left transition-colors hover:bg-gray-50', category === c.category && 'bg-brand-100')}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-gray-800">{c.category}</span>
                      <span className="shrink-0 tabular-nums text-gray-900">
                        <b>{formatCurrency(c.amount)}</b>
                        <span className="ml-2 text-xs text-gray-500">{total ? Math.round((c.amount / total) * 100) : 0}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-gray-900" style={{ width: `${(c.amount / maxCategory) * 100}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            ) : <Empty icon={Receipt} text="Bu oyda xarajat kiritilmagan" />}
          </Card>
        </div>
      )}

      <ExpenseCharts period={month} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Izoh yoki kategoriya..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <Select aria-label="Kategoriya" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Barcha kategoriyalar"
            options={byCategory.map((c) => ({ value: c.category, label: c.category }))} className="md:w-52" />
          <Select aria-label="To'lov usuli" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')} placeholder="Barcha usullar"
            options={EXPENSE_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))} className="md:w-44" />
        </div>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={resetFilters}><X className="h-4 w-4" />Filtrni tozalash</Button>
        )}
        {filtered && list.data && (
          <p className="text-sm text-gray-500 md:ml-auto">Topildi: <b className="text-gray-900">{list.data.meta.total} ta · {formatCurrency(list.data.data.totalAmount)}</b></p>
        )}
      </div>

      {list.error ? <ErrorState error={list.error} onRetry={list.refetch} /> : list.isLoading ? <Loading rows={6} /> : items.length === 0 ? (
        <Card><Empty icon={Receipt} text={filtered ? 'Bu filtr bo\'yicha xarajat topilmadi' : 'Bu oyda xarajat kiritilmagan'} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Sana</th>
                <th className="px-5 py-3 font-medium">Kategoriya</th>
                <th className="px-5 py-3 font-medium">Izoh</th>
                <th className="px-5 py-3 font-medium">Usul</th>
                <th className="px-5 py-3 font-medium">Kiritdi</th>
                <th className="px-5 py-3 text-right font-medium">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((e) => (
                <tr key={e.id} onClick={() => openEdit(e)} className="cursor-pointer hover:bg-gray-50">
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-gray-600">{formatDate(e.date)}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{e.category}</td>
                  <td className="max-w-xs truncate px-5 py-3 text-gray-600">{e.note ?? '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">{METHOD_LABELS[e.method]}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">{e.user?.fullName ?? '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-bold tabular-nums text-gray-900">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y divide-gray-100 md:hidden">
            {items.map((e) => (
              <button key={e.id} onClick={() => openEdit(e)} className="flex w-full items-start justify-between gap-3 p-4 text-left active:bg-gray-50">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{e.category}</p>
                  {e.note && <p className="truncate text-sm text-gray-600">{e.note}</p>}
                  <p className="mt-1 text-xs text-gray-500">{formatDate(e.date)} · {METHOD_LABELS[e.method]}{e.user ? ` · ${e.user.fullName}` : ''}</p>
                </div>
                <b className="shrink-0 tabular-nums text-gray-900">{formatCurrency(e.amount)}</b>
              </button>
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</Button>
              <span className="text-gray-500">{page} / {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Keyingi</Button>
            </div>
          )}
        </Card>
      )}

      <ExpenseFormModal open={formOpen} onClose={() => setFormOpen(false)} expense={editing} />
    </div>
  );
}
