import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { settingsApi, smsApi } from '@/api';
import type { SmsEvent, SmsStatus } from '@/types';
import { SMS_EVENT_LABELS, SMS_STATUS_LABELS, options } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { formatDateTime, formatNumber, formatPhone } from '@/lib/utils';
import { SMS_VARIANT } from '@/components/orders/detail/SmsCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty, Loading } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const AUTO_EVENTS: SmsEvent[] = [
  'ORDER_CREATED', 'DESIGN_SENT', 'DESIGN_REMINDER', 'ORDER_READY', 'INSTALLATION_SCHEDULED', 'PAYMENT_RECEIVED', 'DEBT_REMINDER',
];

export function SmsSettings() {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [testPhone, setTestPhone] = React.useState('+998 ');
  const [status, setStatus] = React.useState('');
  const info = useQuery({ queryKey: ['sms', 'status'], queryFn: smsApi.status });
  const log = useQuery({ queryKey: ['sms', 'log', status], queryFn: () => smsApi.messages({ status: status || undefined, limit: 50 }) });
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
  const retry = useMutation({ mutationFn: smsApi.retry, onSuccess: refresh, onError: toast.error });

  if (info.isLoading || !info.data) return <Loading />;
  const s = info.data;
  const toggleEvent = (e: SmsEvent, on: boolean) => save.mutate({ smsEvents: { ...s.events, [e]: on } });

  return (
    <div className="space-y-6">
      <Card title="SMS xizmati">
        {s.live ? (
          <p className="flex items-center rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mr-2 h-4 w-4" />Ulangan: {s.provider}{s.balance !== null ? ` · balans: ${formatNumber(s.balance)} so'm` : ''}
          </p>
        ) : (
          <p className="flex items-start rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
            Test rejimi: SMSlar yuborilmaydi, faqat jurnalga yoziladi. Ulash uchun backend .env faylida SMS_PROVIDER=eskiz, ESKIZ_EMAIL va ESKIZ_PASSWORD ni kiriting.
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
          <input type="checkbox" checked={s.enabled} onChange={(e) => save.mutate({ smsEnabled: e.target.checked })} />
          Avtomatik SMS yoqilgan
        </label>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {AUTO_EVENTS.map((e) => (
            <label key={e} className={`flex items-center gap-2 text-sm ${s.enabled ? 'text-gray-700' : 'text-gray-400'}`}>
              <input type="checkbox" disabled={!s.enabled} checked={s.events[e] !== false} onChange={(ev) => toggleEvent(e, ev.target.checked)} />
              {SMS_EVENT_LABELS[e]}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">Eslatmalar faqat 9:00–20:00 oralig'ida yuboriladi. Mijoz kartasida "Avtomatik SMS yuborilmasin" belgilansa, unga yuborilmaydi.</p>
        {user.role === 'ADMIN' && (
          <form className="mt-6 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); test.mutate(); }}>
            <Input label="Test SMS" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} inputMode="tel" />
            <Button type="submit" isLoading={test.isPending}>Yuborish</Button>
          </form>
        )}
      </Card>

      <Card title="SMS jurnali" actions={<div className="w-40"><Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Barchasi" options={options(SMS_STATUS_LABELS)} /></div>}>
        {log.isLoading ? <Loading /> : !log.data?.data.length ? <Empty text="SMS yo'q" /> : (
          <div className="divide-y divide-gray-50">
            {log.data.data.map((m) => (
              <div key={m.id} className="py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {formatPhone(m.phone)} · {m.client?.name ?? '—'} {m.order && <span className="text-brand-600">{m.order.number}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    {m.status === 'FAILED' && <button onClick={() => retry.mutate(m.id)} className="text-brand-600" aria-label="Qayta yuborish"><RotateCcw className="h-4 w-4" /></button>}
                    <Badge variant={SMS_VARIANT[m.status]}>{SMS_STATUS_LABELS[m.status]}</Badge>
                  </span>
                </div>
                <p className="mt-1 text-gray-600">{m.text}</p>
                <p className="mt-1 text-xs text-gray-400">{SMS_EVENT_LABELS[m.event]} · {formatDateTime(m.sentAt ?? m.createdAt)}{m.error ? ` · ${m.error}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
