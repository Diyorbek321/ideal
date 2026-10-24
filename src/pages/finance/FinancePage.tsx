import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, DollarSign, FileSpreadsheet, Landmark, Plus, Trash2, TrendingDown } from 'lucide-react';
import { expensesApi, paymentsApi, reportsApi } from '@/api';
import type { PaymentMethod } from '@/types';
import { CLIENT_TYPE_LABELS, METHOD_LABELS } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { cn, copyText, formatCurrency, formatDate, telegramShareUrl } from '@/lib/utils';
import { AccountingExportModal } from '@/components/finance/AccountingExportModal';
import { ExpenseFormModal } from '@/components/finance/ExpenseFormModal';
import { FinanceCharts } from '@/components/finance/FinanceCharts';
import { MonthInput, periodLabel, usePdfExport } from '@/components/reports/ReportToolbar';
import { Button } from '@/components/ui/Button';
import { RevenueChart } from '@/components/finance/RevenueChart';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'TENDER'];
const METHOD_ICONS = { CASH: Banknote, CARD: CreditCard, TRANSFER: Landmark, TENDER: Landmark };

function monthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return { from: new Date(y, m - 1, 1).toISOString(), to: new Date(y, m, 1).toISOString() };
}

export default function FinancePage() {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = React.useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const range = monthBounds(month);
  const [reminder, setReminder] = React.useState<{ message: string; phones: string[]; smsStatus: string | null; smsError: string | null } | null>(null);
  const [expenseOpen, setExpenseOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const pdf = usePdfExport(`moliya_${month}`);

  const summary = useQuery({ queryKey: ['summary', month], queryFn: () => reportsApi.summary(range.from, range.to) });
  const debts = useQuery({ queryKey: ['debts'], queryFn: paymentsApi.debts });
  const recent = useQuery({ queryKey: ['payments', month], queryFn: () => paymentsApi.list({ ...range, limit: 8 }) });
  const expenses = useQuery({ queryKey: ['expenses', month], queryFn: () => expensesApi.list({ ...range, limit: 50 }) });
  const byMethod = useQueries({
    queries: METHODS.map((method) => ({
      queryKey: ['payments', month, method],
      queryFn: () => paymentsApi.list({ ...range, method, limit: 1 }),
    })),
  });

  const remind = useMutation({ mutationFn: paymentsApi.remind, onSuccess: setReminder, onError: toast.error });
  const delExpense = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['summary'] }); },
    onError: toast.error,
  });

  if (summary.isLoading) return <Loading rows={8} />;
  if (summary.error || !summary.data) return <ErrorState error={summary.error} onRetry={summary.refetch} />;
  const s = summary.data;
  const chart = s.revenueByDay.map((r) => ({ day: `${r.day.slice(8, 10)}.${r.day.slice(5, 7)}`, amount: r.amount }));

  return (
    <div ref={pdf.ref} className="space-y-8 bg-gray-50">
      <PageHeader
        title="Moliya va to'lovlar"
        subtitle={`Tushum, xarajat va qarzlar · ${periodLabel(month)}`}
        actions={(
          <div className="flex flex-wrap gap-2 sm:gap-3" data-pdf-hide>
            <MonthInput value={month} onChange={setMonth} />
            {pdf.button}
            <Button variant="outline" onClick={() => setExpenseOpen(true)}>
              <Plus className="h-4 w-4" />Xarajat
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)}><FileSpreadsheet className="h-4 w-4" />Buxgalter uchun Excel</Button>
          </div>
        )}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="border-0 bg-brand-400 p-6 text-gray-900">
          <div className="mb-4 w-fit rounded-lg bg-white/20 p-2"><DollarSign className="h-6 w-6" /></div>
          <p className="mb-1 text-sm opacity-80">Tushum</p>
          <p className="font-display text-base font-bold tabular-nums sm:text-2xl">{formatCurrency(s.revenue)}</p>
        </Card>
        <Card className="p-6">
          <p className="mb-1 text-sm text-gray-500">Xarajatlar</p>
          <p className="font-display text-base font-bold tabular-nums sm:text-2xl text-gray-900">{formatCurrency(s.expenses)}</p>
          <p className={cn('mt-2 text-sm font-bold', s.cashFlow >= 0 ? 'text-emerald-600' : 'text-red-600')}>Sof oqim: {formatCurrency(s.cashFlow)}</p>
        </Card>
        <Card className="p-6">
          <p className="mb-1 text-sm text-gray-500">Buyurtmalar</p>
          <p className="font-display text-base font-bold tabular-nums sm:text-2xl text-gray-900">{s.ordersCount} ta</p>
          <p className="mt-2 text-sm text-gray-500">{formatCurrency(s.ordersAmount)}</p>
        </Card>
        <Card className="border-red-200 bg-red-50 p-6 text-red-800">
          <div className="mb-4 w-fit rounded-lg bg-white/20 p-2"><TrendingDown className="h-6 w-6" /></div>
          <p className="mb-1 text-sm opacity-80">Umumiy nasiya</p>
          <p className="font-display text-base font-bold tabular-nums sm:text-2xl">{formatCurrency(debts.data?.total)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {METHODS.map((m, i) => {
          const Icon = METHOD_ICONS[m];
          return (
            <Card key={m} className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-gray-50 p-2 text-gray-600"><Icon className="h-5 w-5" /></div>
              <div><p className="text-xs text-gray-500">{METHOD_LABELS[m]}</p><p className="font-bold">{formatCurrency(byMethod[i]?.data?.data.totalAmount)}</p></div>
            </Card>
          );
        })}
      </div>

      <FinanceCharts period={month} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Card title="Kunlik tushum" className="lg:col-span-2">
          {chart.length ? (
            <RevenueChart data={chart} className="h-64 sm:h-72" />
          ) : <Empty text="Bu oyda to'lovlar yo'q" />}
        </Card>

        <Card title="Oxirgi to'lovlar">
          {recent.data?.data.items.length ? (
            <div className="space-y-3">
              {recent.data.data.items.map((p) => (
                <Link key={p.id} to={p.orderId ? `/orders/${p.orderId}` : `/ad-screens?tab=campaigns&open=${p.campaignId}`} className="flex items-center justify-between rounded-xl border border-gray-50 p-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                    <p className="text-[11px] text-gray-500">{p.client?.name} · {p.order?.number ?? p.campaign?.number}</p>
                  </div>
                  <span className="text-[11px] uppercase text-gray-400">{METHOD_LABELS[p.method]}<br />{formatDate(p.createdAt)}</span>
                </Link>
              ))}
            </div>
          ) : <Empty text="To'lovlar yo'q" />}
        </Card>
      </div>

      <Card title="Qarzdorlar (nasiya)" description="Muddati o'tganlar birinchi">
        {debts.isLoading ? <Loading /> : !debts.data?.items.length ? <Empty text="Qarzdorlar yo'q" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 font-semibold">Mijoz</th><th className="px-4 py-3 font-semibold">Buyurtma</th>
                  <th className="px-4 py-3 font-semibold">Muddat</th><th className="px-4 py-3 font-semibold">Summa</th>
                  <th className="px-4 py-3 font-semibold">Qarz</th><th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {debts.data.items.map((d) => (
                  <tr key={d.orderId ?? d.campaignId} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3"><p className="font-medium">{d.client.name}</p><p className="text-xs text-gray-400">{CLIENT_TYPE_LABELS[d.client.type]}</p></td>
                    <td className="px-4 py-3">
                      <Link to={d.orderId ? `/orders/${d.orderId}` : `/ad-screens?tab=campaigns&open=${d.campaignId}`} className="font-bold text-brand-600 hover:underline">{d.orderNumber}</Link>
                      {d.campaignId && <span className="block text-xs text-gray-400">LED reklama</span>}
                    </td>
                    <td className={cn('px-4 py-3', d.daysOverdue > 0 ? 'font-bold text-red-600' : 'text-gray-500')}>
                      {d.dueDate ? formatDate(d.dueDate) : '—'}{d.daysOverdue > 0 && <span className="block text-xs">{d.daysOverdue} kun o'tdi</span>}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(d.totalAmount)}</td>
                    <td className="px-4 py-3 font-black text-red-600">{formatCurrency(d.remaining)}</td>
                    <td className="px-4 py-3 text-right">
                      {d.orderId && <Button variant="outline" size="sm" isLoading={remind.isPending && remind.variables === d.orderId} onClick={() => remind.mutate(d.orderId!)}>Eslatma</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Xarajatlar" actions={<Link to="/expenses" className="text-sm font-semibold text-gray-900 underline-offset-4 hover:underline">Hammasi →</Link>}>
        {expenses.data?.data.byCategory.length ? (
          <div className="mb-4 flex flex-wrap gap-3">
            {expenses.data.data.byCategory.map((c) => (
              <span key={c.category} className="rounded-full bg-gray-100 px-3 py-1 text-xs">{c.category}: <b>{formatCurrency(c.amount)}</b></span>
            ))}
          </div>
        ) : null}
        {expenses.data?.data.items.length ? (
          <div className="divide-y divide-gray-50 text-sm">
            {expenses.data.data.items.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2">
                <span><b>{e.category}</b> <span className="text-gray-500">· {formatDate(e.date)}{e.note ? ` · ${e.note}` : ''}</span></span>
                <span className="flex items-center gap-3">
                  <b>{formatCurrency(e.amount)}</b>
                  {user.role === 'ADMIN' && (
                    <button onClick={() => window.confirm('Xarajatni o\'chirasizmi?') && delExpense.mutate(e.id)} className="text-gray-300 hover:text-red-600" aria-label="O'chirish">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : <Empty text="Bu oyda xarajat kiritilmagan" />}
      </Card>

      <Modal open={!!reminder} onClose={() => setReminder(null)} title="Qarz eslatmasi">
        {reminder && (
          <div className="space-y-4">
            {reminder.smsStatus === 'QUEUED' && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">SMS eslatma navbatga qo'yildi va yuboriladi.</p>}
            {reminder.smsStatus === 'SKIPPED' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">SMS yuborilmadi: {reminder.smsError}</p>}
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm">{reminder.message}</pre>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={async () => (await copyText(reminder.message)) && toast.success('Nusxa olindi')}>Nusxa olish</Button>
              <a href={telegramShareUrl(reminder.message)} target="_blank" rel="noreferrer"><Button>Telegram</Button></a>
              {reminder.phones[0] && <a href={`sms:${reminder.phones[0]}?body=${encodeURIComponent(reminder.message)}`}><Button variant="outline">SMS</Button></a>}
            </div>
          </div>
        )}
      </Modal>

      <ExpenseFormModal open={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <AccountingExportModal open={exportOpen} onClose={() => setExportOpen(false)} month={month} />
    </div>
  );
}
