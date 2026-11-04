import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, requestsApi } from '@/api';
import type { AbsenceReason, DisputeTarget, StaffRequestKind, StaffRequestInput } from '@/types';
import { ABSENCE_LABELS, REQUEST_KIND_LABELS, options } from '@/lib/labels';
import { cn, currentPeriod, formatCurrency, parseMoney, toDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

const KINDS: StaffRequestKind[] = ['ABSENCE', 'ADVANCE', 'DISPUTE'];
const HINT: Record<StaffRequestKind, string> = {
  ABSENCE: 'Tasdiqlansa — bu kunlar «kelmadi» deb hisoblanmaydi va oylikdan ayirilmaydi',
  ADVANCE: 'Tasdiqlansa — summa shu oy oyligidan avans sifatida ushlanadi',
  DISPUTE: 'Kechikish yoki erta ketish noto\'g\'ri belgilangan bo\'lsa (GPS xato, mijozga borgansiz) — sababini yozing',
};
const dm = (day: string) => day.split('-').reverse().join('.');

/** E'tiroz uchun: shu va o'tgan oydagi kechikish/erta ketish/«Ketdim» bosilmagan belgilari */
function useDisputable() {
  const cur = currentPeriod();
  const [y, m] = cur.split('-').map(Number) as [number, number];
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const q = useQuery({
    queryKey: ['attendance', 'mine', cur],
    queryFn: async () => [...(await attendanceApi.mine(cur)), ...(await attendanceApi.mine(prev))],
  });
  return (q.data ?? []).flatMap((r) => [
    ...(r.lateMinutes ? [{ value: `${r.id}:LATE`, label: `${dm(r.day)} — ${r.lateMinutes} daq kechikish` }] : []),
    ...(r.earlyLeaveMinutes ? [{ value: `${r.id}:EARLY_LEAVE`, label: `${dm(r.day)} — ${r.earlyLeaveMinutes} daq erta ketish` }] : []),
    ...(r.autoClosed ? [{ value: `${r.id}:UNMARKED`, label: `${dm(r.day)} — «Ketdim» bosilmagan` }] : []),
  ]);
}

export function RequestForm() {
  const toast = useToast();
  const qc = useQueryClient();
  const today = toDateInput(new Date());
  const [kind, setKind] = React.useState<StaffRequestKind>('ABSENCE');
  const [f, setF] = React.useState({ dayFrom: today, dayTo: today, reason: 'DAY_OFF' as AbsenceReason, amount: '', mark: '', note: '' });
  const disputable = useDisputable();

  const amount = parseMoney(f.amount);
  const [attendanceId, target] = f.mark.split(':') as [string, DisputeTarget | undefined];
  const body: StaffRequestInput | null = f.note.trim().length < 3 ? null
    : kind === 'ABSENCE' ? (f.dayFrom && f.dayTo && f.dayFrom <= f.dayTo ? { kind, dayFrom: f.dayFrom, dayTo: f.dayTo, absenceReason: f.reason, note: f.note } : null)
      : kind === 'ADVANCE' ? (amount && amount > 0 ? { kind, amount, note: f.note } : null)
        : target ? { kind, attendanceId, disputeTarget: target, note: f.note } : null;

  const send = useMutation({
    mutationFn: (b: StaffRequestInput) => requestsApi.create(b),
    onSuccess: () => {
      toast.success('So\'rov yuborildi — direktor ko\'rib chiqadi');
      setF((x) => ({ ...x, amount: '', mark: '', note: '' }));
      void qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: toast.error,
  });

  return (
    <Card title="Yangi so'rov" description={HINT[kind]}>
      <div className="mt-2 flex flex-wrap gap-2" role="tablist">
        {KINDS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium ring-1', kind === k ? 'bg-brand-400 text-white ring-brand-400' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50')}>
            {REQUEST_KIND_LABELS[k]}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {kind === 'ABSENCE' && (
          <>
            <Select label="Sabab" value={f.reason} options={options(ABSENCE_LABELS)} onChange={(e) => setF({ ...f, reason: e.target.value as AbsenceReason })} />
            <Input label="Qaysi kundan" type="date" value={f.dayFrom} onChange={(e) => setF({ ...f, dayFrom: e.target.value, dayTo: f.dayTo < e.target.value ? e.target.value : f.dayTo })} />
            <Input label="Qaysi kungacha" type="date" min={f.dayFrom} value={f.dayTo} onChange={(e) => setF({ ...f, dayTo: e.target.value })} />
          </>
        )}
        {kind === 'ADVANCE' && (
          <div>
            <Input label="Summa (so'm)" money inputMode="numeric" placeholder="500 000" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            {amount ? <p className="mt-1 text-xs text-gray-500">{formatCurrency(amount)}</p> : null}
          </div>
        )}
        {kind === 'DISPUTE' && (
          <div className="md:col-span-2">
            <Select label="Qaysi belgi" value={f.mark} placeholder={disputable.length ? 'Tanlang' : 'Shu va o\'tgan oyda kechikish yoki erta ketish yo\'q'}
              options={disputable} disabled={!disputable.length} onChange={(e) => setF({ ...f, mark: e.target.value })} />
          </div>
        )}
      </div>
      <div className="mt-4">
        <Textarea label="Sababi" placeholder={kind === 'DISPUTE' ? 'Masalan: ertalab mijoz obyektiga to\'g\'ridan borgandim' : 'Qisqacha yozing'}
          value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </div>
      <div className="mt-4 flex justify-end">
        <Button disabled={!body} isLoading={send.isPending} onClick={() => body && send.mutate(body)}>Yuborish</Button>
      </div>
    </Card>
  );
}
