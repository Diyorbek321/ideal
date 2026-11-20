import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Send, Trash2, Wallet } from 'lucide-react';
import { paymentsApi, type DebtReminder } from '@/api';
import type { Debt } from '@/types';
import { CLIENT_TYPE_LABELS } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { cn, formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { Stat } from '@/components/reports/charts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { DebtReminderModal } from '@/components/debts/DebtReminderModal';
import { LegacyDebtFormModal, LegacyPayModal } from '@/components/debts/LegacyDebtModals';

type Filter = 'all' | 'overdue' | 'legacy' | 'orders' | 'led';
type View = 'debts' | 'clients';

const FILTERS: Array<{ key: Filter; label: string; match: (d: Debt) => boolean }> = [
  { key: 'all', label: 'Hammasi', match: () => true },
  { key: 'overdue', label: 'Muddati o\'tgan', match: (d) => d.daysOverdue > 0 },
  { key: 'legacy', label: 'Eski qarzlar', match: (d) => !!d.legacyDebtId },
  { key: 'orders', label: 'Buyurtmalar', match: (d) => !!d.orderId },
  { key: 'led', label: 'LED reklama', match: (d) => !!d.campaignId },
];

const debtKey = (d: Debt) => d.orderId ?? d.campaignId ?? d.legacyDebtId ?? d.orderNumber;

const debtLink = (d: Debt) =>
  d.orderId ? `/orders/${d.orderId}` : d.campaignId ? `/ad-screens?tab=campaigns&open=${d.campaignId}` : `/clients/${d.client.id}`;

interface ClientGroup {
  client: Debt['client'];
  count: number;
  remaining: number;
  legacy: number;
  maxOverdue: number;
  balance: number;
}

function groupByClient(debts: Debt[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();
  for (const d of debts) {
    const g = map.get(d.client.id) ?? { client: d.client, count: 0, remaining: 0, legacy: 0, maxOverdue: 0, balance: d.clientBalance };
    map.set(d.client.id, {
      ...g,
      count: g.count + 1,
      remaining: g.remaining + d.remaining,
      legacy: g.legacy + (d.legacyDebtId ? d.remaining : 0),
      maxOverdue: Math.max(g.maxOverdue, d.daysOverdue),
    });
  }
  return [...map.values()].sort((a, b) => b.remaining - a.remaining);
}

/**
 * Barcha qarzdorlar bir joyda: buyurtma, LED reklama va ERP'dan oldingi eski qarzlar.
 * Eski qarz shu yerdan qo'shiladi va to'lanadi.
 */
export default function DebtsPage() {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<Filter>('all');
  const [view, setView] = React.useState<View>('debts');
  const [q, setQ] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [paying, setPaying] = React.useState<Debt | null>(null);
  const [reminder, setReminder] = React.useState<DebtReminder | null>(null);

  const debts = useQuery({ queryKey: ['debts'], queryFn: paymentsApi.debts });

  const remind = useMutation({
    mutationFn: (d: Debt) => (d.legacyDebtId ? paymentsApi.remindLegacy(d.legacyDebtId) : paymentsApi.remind(d.orderId!)),
    onSuccess: (r) => { setReminder(r); qc.invalidateQueries({ queryKey: ['sms'] }); },
    onError: toast.error,
  });
  const remindAll = useMutation({
    mutationFn: paymentsApi.remindAll,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sms'] });
      toast.success(`SMS yuborildi: ${r.queued} ta` + (r.skipped ? ` · bugun eslatilgan ${r.skipped} ta o'tkazildi` : '') + (r.failed ? ` · ${r.failed} ta raqam yo'q/noto'g'ri` : ''));
    },
    onError: toast.error,
  });
  const removeLegacy = useMutation({
    mutationFn: paymentsApi.removeLegacy,
    onSuccess: () => { toast.success('Eski qarz o\'chirildi'); invalidateOrderViews(qc); },
    onError: toast.error,
  });

  const all = debts.data?.items ?? [];
  const needle = q.trim().toLowerCase();
  const matchFilter = FILTERS.find((f) => f.key === filter)!.match;
  const shown = all.filter((d) => matchFilter(d) && (!needle
    || d.client.name.toLowerCase().includes(needle)
    || d.orderNumber.toLowerCase().includes(needle)
    || d.client.phones.some((p) => p.replace(/\D/g, '').includes(needle.replace(/\D/g, '') || '#'))));
  const groups = groupByClient(shown);
  const sum = (list: Debt[]) => list.reduce((s, d) => s + d.remaining, 0);
  const overdue = all.filter((d) => d.daysOverdue > 0);
  const legacy = all.filter((d) => d.legacyDebtId);
  const smsTargets = all.filter((d) => d.orderId || d.legacyDebtId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qarzdorlar"
        subtitle="Buyurtma, LED reklama va ERP'dan oldingi eski qarzlar — hammasi bir joyda"
        actions={(
          <div className="flex flex-wrap gap-2">
            {smsTargets.length > 0 && (
              <Button variant="outline" isLoading={remindAll.isPending}
                onClick={() => window.confirm(`${smsTargets.length} ta qarz bo'yicha mijozlarga SMS eslatma yuborilsinmi? Bugun eslatilganlarga qayta yuborilmaydi.`) && remindAll.mutate()}>
                <Send className="h-4 w-4" />Hammasiga SMS
              </Button>
            )}
            <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Eski qarz</Button>
          </div>
        )}
      />

      {debts.isLoading ? <Loading rows={6} /> : debts.error || !debts.data ? <ErrorState error={debts.error} onRetry={debts.refetch} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat tone="bad" label="Jami qarz" value={formatCurrency(debts.data.total)} hint={`${all.length} ta qarz`} />
            <Stat label="Muddati o'tgan" value={formatCurrency(sum(overdue))} hint={`${overdue.length} ta`} />
            <Stat label="Eski qarzlar" value={formatCurrency(sum(legacy))} hint={`${legacy.length} ta (ERP'dan oldingi)`} />
            <Stat label="Qarzdor mijozlar" value={`${groupByClient(all).length} ta`} />
          </div>

          <Card>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => {
                  const count = all.filter(f.match).length;
                  return (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                      className={cn('rounded-full px-3 py-1.5 text-sm font-medium', filter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                      {f.label} <span className="opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mijoz, raqam yoki telefon"
                    className="h-10 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div className="flex rounded-md border border-gray-200 p-0.5 text-sm">
                  {(['debts', 'clients'] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)}
                      className={cn('rounded px-3 py-1.5 font-medium', view === v ? 'bg-gray-900 text-white' : 'text-gray-600')}>
                      {v === 'debts' ? 'Har qarz' : 'Mijoz bo\'yicha'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {shown.length === 0 ? (
              <Empty icon={Wallet} text={all.length ? 'Bu filtr bo\'yicha qarz yo\'q' : 'Qarzdorlar yo\'q. Daftardagi eski qarzlarni «Eski qarz» tugmasi bilan kiriting'} />
            ) : view === 'clients' ? (
              <ClientsTable groups={groups} />
            ) : (
              <div className="-mx-5 overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-2 font-semibold sm:px-6">Mijoz</th>
                      <th className="px-2 py-2 font-semibold">Qarz</th>
                      <th className="px-2 py-2 font-semibold">Muddat</th>
                      <th className="px-2 py-2 text-right font-semibold">Summa</th>
                      <th className="px-2 py-2 text-right font-semibold">Qoldiq</th>
                      <th className="px-5 py-2 sm:px-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((d) => (
                      <tr key={debtKey(d)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                        <td className="px-5 py-2.5 sm:px-6">
                          <Link to={`/clients/${d.client.id}`} className="font-medium text-gray-900 hover:underline">{d.client.name}</Link>
                          <p className="text-xs text-gray-500">{CLIENT_TYPE_LABELS[d.client.type]} · {formatPhone(d.client.phones[0])}</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <Link to={debtLink(d)} className="font-bold text-brand-600 hover:underline">{d.orderNumber}</Link>
                          {d.legacyDebtId && <span className="block max-w-[220px] truncate text-xs text-amber-700" title={d.legacyNote ?? undefined}>Eski qarz{d.legacyNote ? ` · ${d.legacyNote}` : ''}</span>}
                          {d.campaignId && <span className="block text-xs text-gray-400">LED reklama</span>}
                        </td>
                        <td className={cn('px-2 py-2.5', d.daysOverdue > 0 ? 'font-bold text-red-600' : 'text-gray-500')}>
                          {d.dueDate ? formatDate(d.dueDate) : '—'}{d.daysOverdue > 0 && <span className="block text-xs">{d.daysOverdue} kun o'tdi</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(d.totalAmount)}</td>
                        <td className="px-2 py-2.5 text-right font-black tabular-nums text-red-600">
                          {formatCurrency(d.remaining)}
                          {d.clientBalance > 0 && <span className="block text-xs font-medium text-sky-700">Balansda: {formatCurrency(d.clientBalance)}</span>}
                        </td>
                        <td className="px-5 py-2.5 sm:px-6">
                          <div className="flex justify-end gap-2">
                            {d.legacyDebtId && <Button size="sm" onClick={() => setPaying(d)}>To'lov</Button>}
                            {(d.orderId || d.legacyDebtId) && (
                              <Button variant="outline" size="sm" isLoading={remind.isPending && remind.variables === d}
                                onClick={() => (d.clientBalance <= 0 || window.confirm(`Mijoz balansida ${formatCurrency(d.clientBalance)} bor. Baribir eslatma yuborilsinmi?`)) && remind.mutate(d)}>
                                Eslatma
                              </Button>
                            )}
                            {d.legacyDebtId && user.role === 'ADMIN' && d.paidAmount === 0 && (
                              <button aria-label="O'chirish" className="text-gray-300 hover:text-red-600"
                                onClick={() => window.confirm(`${d.orderNumber} eski qarzni o'chirasizmi?`) && removeLegacy.mutate(d.legacyDebtId!)}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td className="px-5 py-3 sm:px-6" colSpan={4}>Jami ({shown.length} ta)</td>
                      <td className="px-2 py-3 text-right tabular-nums text-red-600">{formatCurrency(sum(shown))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <LegacyDebtFormModal open={adding} onClose={() => setAdding(false)} />
      <LegacyPayModal debt={paying} onClose={() => setPaying(null)} />
      <DebtReminderModal reminder={reminder} onClose={() => setReminder(null)} />
    </div>
  );
}

function ClientsTable({ groups }: { groups: ClientGroup[] }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <th className="px-5 py-2 font-semibold sm:px-6">Mijoz</th>
            <th className="px-2 py-2 text-right font-semibold">Qarzlar</th>
            <th className="px-2 py-2 text-right font-semibold">Shundan eski</th>
            <th className="px-2 py-2 text-right font-semibold">Eng ko'p kechikish</th>
            <th className="px-5 py-2 text-right font-semibold sm:px-6">Jami qarz</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
              <td className="px-5 py-2.5 sm:px-6">
                <Link to={`/clients/${g.client.id}/statement`} className="font-medium text-gray-900 hover:underline">{g.client.name}</Link>
                <p className="text-xs text-gray-500">{CLIENT_TYPE_LABELS[g.client.type]} · {formatPhone(g.client.phones[0])}</p>
              </td>
              <td className="px-2 py-2.5 text-right">{g.count} ta</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-amber-700">{g.legacy ? formatCurrency(g.legacy) : '—'}</td>
              <td className={cn('px-2 py-2.5 text-right', g.maxOverdue > 0 ? 'font-semibold text-red-600' : 'text-gray-400')}>
                {g.maxOverdue > 0 ? `${g.maxOverdue} kun` : '—'}
              </td>
              <td className="px-5 py-2.5 text-right font-black tabular-nums text-red-600 sm:px-6">
                {formatCurrency(g.remaining)}
                {g.balance > 0 && <span className="block text-xs font-medium text-sky-700">Balansda: {formatCurrency(g.balance)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
