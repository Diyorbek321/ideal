import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { payrollApi } from '@/api';
import type { AbsenceReason, PaymentMethod, PayrollSheet, PayrollTxKind } from '@/types';
import { METHOD_LABELS, options } from '@/lib/labels';
import { cn, formatCurrency, formatDate, parseMoney, toDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

export const TX_LABELS: Record<PayrollTxKind, string> = { ADVANCE: 'Avans', PAYMENT: 'To\'lov', BONUS: 'Bonus', FINE: 'Jarima' };
const ABSENCE_LABELS: Record<AbsenceReason, string> = { SICK: 'Kasal', VACATION: 'Ta\'til', DAY_OFF: 'Ruxsat bilan dam', OTHER: 'Boshqa sabab' };
const dm = (day: string) => day.slice(5).split('-').reverse().join('.');

function Row({ label, amount, strong, tone }: { label: string; amount: number; strong?: boolean; tone?: 'muted' | 'brand' | 'green' }) {
  return (
    <div className={cn('flex justify-between gap-4 py-1.5 text-sm', strong && 'border-t border-gray-200 pt-2 font-bold', tone === 'muted' && 'text-gray-500')}>
      <span>{label}</span>
      <span className={cn('whitespace-nowrap tabular-nums', amount < 0 && 'text-red-600', tone === 'brand' && 'text-lg font-black text-gray-900', tone === 'green' && 'text-emerald-700')}>
        {amount < 0 ? '−' : ''}{formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}

/** Varaq: hisob qatorlari va yakun. editable — direktor uchun daftar va sababli kunlar */
export function PayrollSheetView({ sheet, editable = false }: { sheet: PayrollSheet; editable?: boolean }) {
  const { entry } = sheet;
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-100 p-4">
        {sheet.lines.map((l, i) => <Row key={i} label={l.label} amount={l.amount} />)}
        <Row label="Hisoblangan" amount={entry.gross} strong />
        {sheet.transactions.filter((t) => t.kind === 'ADVANCE').map((t) => (
          <Row key={t.id} label={`Avans ${formatDate(t.date)}${t.reason ? ` · ${t.reason}` : ''}`} amount={-t.amount} tone="muted" />
        ))}
        <Row label="Qo'lga" amount={entry.total} strong tone="brand" />
        {sheet.transactions.filter((t) => t.kind === 'PAYMENT').map((t) => (
          <Row key={t.id} label={`To'landi ${formatDate(t.date)}${t.method ? ` · ${METHOD_LABELS[t.method]}` : ''}`} amount={t.amount} tone="green" />
        ))}
        <Row label={entry.remaining > 0 ? 'Qoldiq (berilishi kerak)' : 'Qoldiq'} amount={entry.remaining} strong />
      </div>
      {editable ? <SheetEditor sheet={sheet} /> : <AttendanceNote sheet={sheet} />}
    </div>
  );
}

function AttendanceNote({ sheet }: { sheet: PayrollSheet }) {
  if (!sheet.absentDays.length && !sheet.lateDays.length) return null;
  return (
    <div className="space-y-1 text-xs text-gray-500">
      {sheet.absentDays.length > 0 && <p>Kelmagan kunlar: {sheet.absentDays.map(dm).join(', ')}</p>}
      {sheet.lateDays.length > 0 && <p>Kechikkan: {sheet.lateDays.map((d) => `${dm(d.day)} (${d.minutes} daq)`).join(', ')}</p>}
      <p>Sababli bo'lsa (kasal, ta'til) — direktorga ayting, u belgilab qo'yadi.</p>
    </div>
  );
}

function SheetEditor({ sheet }: { sheet: PayrollSheet }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [kind, setKind] = React.useState<PayrollTxKind>('ADVANCE');
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('CASH');
  const [reason, setReason] = React.useState('');
  const [date, setDate] = React.useState(toDateInput(new Date()));

  const done = (next: PayrollSheet) => {
    qc.setQueryData(['payroll-sheet', sheet.user.id, sheet.period], next);
    qc.invalidateQueries({ queryKey: ['payroll'] });
  };
  const add = useMutation({
    mutationFn: () => {
      const a = parseMoney(amount);
      if (!a || a <= 0) return Promise.reject(new Error('Summani kiriting'));
      return payrollApi.addTx({
        userId: sheet.user.id, period: sheet.period, kind, amount: a, reason: reason.trim() || undefined,
        ...(kind === 'ADVANCE' || kind === 'PAYMENT' ? { method } : {}),
        date: new Date(`${date}T12:00:00`).toISOString(),
      });
    },
    onSuccess: (next) => { toast.success(`${TX_LABELS[kind]} yozildi`); setAmount(''); setReason(''); done(next); },
    onError: toast.error,
  });
  const remove = useMutation({ mutationFn: payrollApi.deleteTx, onSuccess: done, onError: toast.error });
  const excuse = useMutation({
    mutationFn: (v: { day: string; reason: AbsenceReason }) => payrollApi.excuse({ userId: sheet.user.id, ...v }),
    onSuccess: done,
    onError: toast.error,
  });
  const unexcuse = useMutation({ mutationFn: payrollApi.removeExcuse, onSuccess: done, onError: toast.error });

  const needsReason = kind === 'BONUS' || kind === 'FINE';
  const cash = kind === 'ADVANCE' || kind === 'PAYMENT';

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-gray-50 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(TX_LABELS) as PayrollTxKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn('rounded-full border px-3 py-1 text-sm', kind === k ? 'border-gray-900 bg-brand-300 font-semibold text-gray-900' : 'border-gray-200 bg-white text-gray-600')}
            >
              + {TX_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input label="Summa" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder={kind === 'PAYMENT' ? String(sheet.entry.remaining) : ''} />
          <Input label="Sana" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {cash && <Select label="Usul" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={options(METHOD_LABELS)} />}
          <div className={cash ? '' : 'md:col-span-2'}>
            <Input label={needsReason ? 'Sababi *' : 'Izoh'} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={needsReason ? 'Xodim varag\'ida ko\'rinadi' : ''} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {sheet.entry.remaining > 0 && (
            <Button variant="outline" onClick={() => { setKind('PAYMENT'); setAmount(String(sheet.entry.remaining)); }}>Qoldiqni to'lash</Button>
          )}
          <Button disabled={needsReason && !reason.trim()} isLoading={add.isPending} onClick={() => add.mutate()}>Yozish</Button>
        </div>
        {cash && <p className="mt-2 text-xs text-gray-500">Avans va to'lov "Ish haqi" xarajati bo'lib ham yoziladi.</p>}
      </div>

      {sheet.transactions.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">Daftar</p>
          <div className="divide-y divide-gray-50 rounded-xl border border-gray-100">
            {sheet.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-gray-500">{formatDate(t.date)}</span>
                <span className="flex-1 font-medium">{TX_LABELS[t.kind]}{t.reason ? ` · ${t.reason}` : ''}{t.method ? ` · ${METHOD_LABELS[t.method]}` : ''}</span>
                <span className="tabular-nums">{formatCurrency(t.amount)}</span>
                <button
                  type="button"
                  aria-label="O'chirish"
                  className="text-gray-400 hover:text-red-600"
                  onClick={() => window.confirm(`${TX_LABELS[t.kind]} ${formatCurrency(t.amount)} o'chirilsinmi?`) && remove.mutate(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-900">Davomat</p>
        {!sheet.rules.absenceFrom && (
          <p className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Kelmagan kunlar hali ayirilmaydi — Sozlamalar → Davomat'da "qaysi sanadan" ni belgilang.</p>
        )}
        {sheet.absentDays.length === 0 && sheet.excuses.length === 0 && sheet.lateDays.length === 0 && <p className="text-sm text-gray-500">Kelmagan va kechikkan kun yo'q</p>}
        <div className="space-y-1">
          {sheet.absentDays.map((day) => (
            <div key={day} className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-1.5 text-sm">
              <span className="font-medium text-red-800">{dm(day)} — kelmagan</span>
              <select
                className="h-8 rounded border border-red-200 bg-white px-2 text-xs"
                value=""
                aria-label="Sababli deb belgilash"
                onChange={(e) => e.target.value && excuse.mutate({ day, reason: e.target.value as AbsenceReason })}
              >
                <option value="">Sababli deb belgilash…</option>
                {(Object.keys(ABSENCE_LABELS) as AbsenceReason[]).map((r) => <option key={r} value={r}>{ABSENCE_LABELS[r]}</option>)}
              </select>
            </div>
          ))}
          {sheet.excuses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
              <span className="text-gray-700">{dm(e.day)} — {ABSENCE_LABELS[e.reason]}{e.note ? ` (${e.note})` : ''}</span>
              <button type="button" className="text-xs text-gray-500 underline" onClick={() => unexcuse.mutate(e.id)}>Bekor qilish</button>
            </div>
          ))}
          {sheet.lateDays.map((d) => (
            <div key={d.day} className="flex justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
              <span>{dm(d.day)} — {d.minutes} daqiqa kechikdi</span>
              {sheet.rules.latePenalty > 0 && <span>−{formatCurrency(sheet.rules.latePenalty)}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
