import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { settingsApi, smsApi } from '@/api';
import type { SmsEvent, SmsStatus } from '@/types';
import { SMS_EVENT_LABELS, SMS_STATUS_LABELS } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorState, Loading } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

export const AUTO_EVENTS: SmsEvent[] = [
  'ORDER_CREATED', 'DESIGN_SENT', 'DESIGN_REMINDER', 'ORDER_READY', 'INSTALLATION_SCHEDULED', 'PAYMENT_RECEIVED', 'DEBT_REMINDER', 'FEEDBACK_REQUEST',
];

/** Ulanish holati, balans, 30 kunlik statistika, hodisalarni yoqish/o'chirish va test SMS */
export function SmsOverview() {
  const user = useUser();
  const isAdmin = user.role === 'ADMIN';
  const toast = useToast();
  const qc = useQueryClient();
  const [testPhone, setTestPhone] = React.useState('+998 ');
  const info = useQuery({ queryKey: ['sms', 'status'], queryFn: smsApi.status });
  const refresh = () => qc.invalidateQueries({ queryKey: ['sms'] });

  const save = useMutation({
    mutationFn: (body: { smsEnabled?: boolean; smsEvents?: Partial<Record<SmsEvent, boolean>> }) => settingsApi.updateCompany(body),
    onSuccess: () => { toast.success('Saqlandi'); refresh(); qc.invalidateQueries({ queryKey: ['company'] }); },
    onError: toast.error,
  });
  const test = useMutation({
    mutationFn: () => smsApi.test(testPhone),
    onSuccess: (m) => {
      refresh();
      if (m.status === 'SENT') toast.success(info.data?.live ? 'Test SMS yuborildi' : 'Jurnalga yozildi (haqiqiy yuborish o\'chiq)');
      else toast.error(new Error(m.error ?? SMS_STATUS_LABELS[m.status]));
    },
    onError: toast.error,
  });

  if (info.error) return <ErrorState error={info.error} onRetry={info.refetch} />;
  if (info.isLoading || !info.data) return <Loading />;
  const s = info.data;
  const toggleEvent = (e: SmsEvent, on: boolean) => save.mutate({ smsEvents: { ...s.events, [e]: on } });

  return (
    <Card title="SMS xizmati">
      {s.live ? (
        <p className="flex items-center rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" />Ulangan: {s.provider}{s.balance !== null ? ` · balans: ${formatNumber(s.balance)} so'm` : ''}
        </p>
      ) : (
        <p className="flex items-start rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
          Test rejimi: SMSlar yuborilmaydi, faqat jurnalga yoziladi. Ulash uchun serverdagi .env faylida SMS_PROVIDER=eskiz qo'yiladi.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(['SENT', 'QUEUED', 'FAILED', 'SKIPPED'] as SmsStatus[]).map((st) => (
          <div key={st} className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xl font-black text-gray-900">{s.last30Days[st] ?? 0}</p>
            <p className="text-xs text-gray-500">{SMS_STATUS_LABELS[st]} (30 kun)</p>
          </div>
        ))}
      </div>
      <label className="mt-6 flex items-center gap-2 text-sm font-medium text-gray-800">
        <input type="checkbox" disabled={!isAdmin} checked={s.enabled} onChange={(e) => save.mutate({ smsEnabled: e.target.checked })} />
        Avtomatik SMS yoqilgan
      </label>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {AUTO_EVENTS.map((e) => (
          <label key={e} className={`flex items-center gap-2 text-sm ${s.enabled ? 'text-gray-700' : 'text-gray-400'}`}>
            <input type="checkbox" disabled={!s.enabled || !isAdmin} checked={s.events[e] !== false} onChange={(ev) => toggleEvent(e, ev.target.checked)} />
            {SMS_EVENT_LABELS[e]}
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Eslatmalar faqat 9:00–20:00 oralig'ida yuboriladi. Mijoz kartasida "Avtomatik SMS yuborilmasin" belgilansa, unga yuborilmaydi.
        {!isAdmin && ' Sozlamalarni faqat direktor o\'zgartiradi.'}
      </p>
      {isAdmin && (
        <form className="mt-6 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); test.mutate(); }}>
          <Input label="Test SMS" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} inputMode="tel" />
          <Button type="submit" isLoading={test.isPending}>Yuborish</Button>
        </form>
      )}
    </Card>
  );
}
