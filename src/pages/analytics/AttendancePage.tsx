import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { attendanceApi } from '@/api';
import type { AttendanceRecord } from '@/types';
import { ROLE_LABELS } from '@/lib/labels';
import { cn, currentPeriod, fileUrl, formatDateTime } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { Stat } from '@/components/reports/charts';
import { MonthInput, periodLabel, usePdfExport } from '@/components/reports/ReportToolbar';

const hhmm = (iso: string) => formatDateTime(iso).slice(-5);

function Cell({ r, isWorkDay, onSelfie }: { r?: AttendanceRecord; isWorkDay: boolean; onSelfie: (r: AttendanceRecord) => void }) {
  if (!r) return <td className={cn('border border-gray-100 p-0 text-center text-[10px]', isWorkDay ? 'bg-red-50 text-red-400' : 'bg-gray-50 text-gray-300')}>{isWorkDay ? '✕' : ''}</td>;
  return (
    <td className={cn('border border-gray-100 px-0.5 py-1 text-center text-[10px] tabular-nums', r.lateMinutes ? 'bg-amber-50 font-semibold text-amber-800' : 'bg-emerald-50 text-emerald-800')}
      title={`Keldi ${hhmm(r.checkInAt)}${r.checkOutAt ? `, ketdi ${hhmm(r.checkOutAt)}` : ''}${r.lateMinutes ? `, ${r.lateMinutes} daq kech` : ''}`}>
      {r.selfieUrl ? (
        <button type="button" className="underline decoration-dotted underline-offset-2" onClick={() => onSelfie(r)}>{hhmm(r.checkInAt)}</button>
      ) : hhmm(r.checkInAt)}
    </td>
  );
}

export default function AttendancePage() {
  const [period, setPeriod] = React.useState(currentPeriod());
  const pdf = usePdfExport(`davomat_${period}`);
  const [selfie, setSelfie] = React.useState<AttendanceRecord | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['attendance', 'month', period], queryFn: () => attendanceApi.month(period) });

  const days = React.useMemo(() => {
    const [y, m] = period.split('-').map(Number) as [number, number];
    return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${period}-${String(i + 1).padStart(2, '0')}`);
  }, [period]);

  const totals = data ? {
    present: data.users.reduce((s, u) => s + u.present, 0),
    late: data.users.reduce((s, u) => s + u.late, 0),
    absent: data.users.reduce((s, u) => s + u.absent, 0),
  } : null;

  return (
    <div ref={pdf.ref} className="space-y-6 bg-gray-50">
      <PageHeader title="Davomat" subtitle={`Xodimlar ishga kelgan vaqti (check-in) · ${periodLabel(period)}`}
        actions={<div className="flex flex-wrap gap-2" data-pdf-hide><MonthInput value={period} onChange={setPeriod} />{pdf.button}</div>} />
      {isLoading ? <Loading rows={6} /> : error || !data || !totals ? <ErrorState error={error} onRetry={refetch} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Ish boshlanishi" value={data.workStartTime} hint={`${data.workDays.length} ish kuni (yakshanbasiz)`} />
            <Stat tone="good" label="Kelgan (kishi-kun)" value={totals.present} />
            <Stat tone={totals.late ? 'bad' : 'default'} label="Kechikishlar" value={totals.late} />
            <Stat tone={totals.absent ? 'bad' : 'default'} label="Kelmagan (kishi-kun)" value={totals.absent} />
          </div>

          <Card title="Xodimlar bo'yicha">
            {data.users.length === 0 ? <Empty icon={CalendarCheck} text="Xodimlar yo'q" /> : (
              <div className="-mx-5 overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-2 font-semibold sm:px-6">Xodim</th>
                      <th className="px-2 py-2 text-right font-semibold">Keldi</th>
                      <th className="px-2 py-2 text-right font-semibold">Kechikdi</th>
                      <th className="px-2 py-2 text-right font-semibold">Jami kechikish</th>
                      <th className="px-5 py-2 text-right font-semibold sm:px-6">Kelmadi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-2 sm:px-6"><p className="font-medium text-gray-900">{u.fullName}</p><p className="text-xs text-gray-500">{ROLE_LABELS[u.role]}</p></td>
                        <td className="px-2 py-2 text-right tabular-nums">{u.present} kun</td>
                        <td className={cn('px-2 py-2 text-right tabular-nums', u.late && 'font-semibold text-amber-700')}>{u.late} marta</td>
                        <td className="px-2 py-2 text-right tabular-nums text-gray-600">{u.lateMinutes ? `${Math.floor(u.lateMinutes / 60)} soat ${u.lateMinutes % 60} daq` : '—'}</td>
                        <td className={cn('px-5 py-2 text-right tabular-nums sm:px-6', u.absent && 'font-semibold text-red-600')}>{u.absent} kun</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Kunlik jadval" description="Yashil — vaqtida, sariq — kechikkan, qizil — kelmagan. Tagiga chizilgan vaqt — selfi bor, bosib ko'ring">
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white px-3 py-1 text-left font-semibold">Xodim</th>
                    {days.map((d) => <th key={d} className="min-w-[34px] px-0.5 py-1 text-center font-medium text-gray-500">{Number(d.slice(8))}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-1 font-medium">{u.fullName}</td>
                      {days.map((d) => <Cell key={d} isWorkDay={data.workDays.includes(d)} r={data.records.find((r) => r.userId === u.id && r.day === d)} onSelfie={setSelfie} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Modal open={!!selfie} onClose={() => setSelfie(null)}
            title={selfie ? `${data.users.find((u) => u.id === selfie.userId)?.fullName ?? ''} · ${selfie.day.split('-').reverse().join('.')} ${hhmm(selfie.checkInAt)}` : ''}>
            {selfie?.selfieUrl && <img src={fileUrl(selfie.selfieUrl)} alt="Check-in selfisi" className="mx-auto max-h-[70dvh] rounded-2xl object-contain" />}
          </Modal>
        </>
      )}
    </div>
  );
}
