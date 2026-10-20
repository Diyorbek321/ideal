import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, RotateCcw, Send } from 'lucide-react';
import { smsApi } from '@/api';
import type { OrderDetail, SmsStatus } from '@/types';
import { SMS_EVENT_LABELS, SMS_STATUS_LABELS } from '@/lib/labels';
import { copyText, formatDateTime } from '@/lib/utils';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

export const SMS_VARIANT: Record<SmsStatus, NonNullable<BadgeProps['variant']>> = {
  QUEUED: 'info', SENT: 'success', FAILED: 'error', SKIPPED: 'outline',
};

const MAX_LEN = 300;

export function SmsCard({ order }: { order: OrderDetail }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [text, setText] = React.useState('');
  const { data } = useQuery({ queryKey: ['sms', order.id], queryFn: () => smsApi.messages({ orderId: order.id, limit: 20 }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['sms'] });

  const send = useMutation({
    mutationFn: () => smsApi.send(order.id, text.trim()),
    onSuccess: (m) => {
      setText('');
      refresh();
      if (m.status === 'SENT') toast.success('SMS yuborildi');
      else toast.error(new Error(m.error ?? `SMS holati: ${SMS_STATUS_LABELS[m.status]}`));
    },
    onError: toast.error,
  });
  const retry = useMutation({ mutationFn: smsApi.retry, onSuccess: refresh, onError: toast.error });

  const trackLink = order.trackingToken ? `${window.location.origin}/t/${order.trackingToken}` : null;

  return (
    <Card
      title="Mijozga SMS"
      actions={trackLink ? (
        <Button size="sm" variant="outline" onClick={async () => (await copyText(trackLink)) && toast.success('Kuzatish havolasi nusxalandi')}>
          <Copy className="mr-1 h-3 w-3" />Kuzatish havolasi
        </Button>
      ) : undefined}
    >
      <form className="mb-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (text.trim().length >= 3) send.mutate(); }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          rows={2}
          placeholder="Masalan: Buyurtmangiz ertaga soat 15:00 da tayyor bo'ladi"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="SMS matni"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{text.length}/{MAX_LEN} · {order.client.phones[0] ?? 'telefon yo\'q'}</span>
          <Button type="submit" size="sm" disabled={text.trim().length < 3} isLoading={send.isPending}><Send className="mr-1 h-3 w-3" />Yuborish</Button>
        </div>
      </form>
      {data?.data.length ? (
        <div className="space-y-2">
          {data.data.map((m) => (
            <div key={m.id} className="rounded-lg border border-gray-100 p-2 text-xs">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium text-gray-700">{SMS_EVENT_LABELS[m.event]}</span>
                <span className="flex items-center gap-1">
                  {m.status === 'FAILED' && (
                    <button onClick={() => retry.mutate(m.id)} className="text-blue-600" aria-label="Qayta yuborish"><RotateCcw className="h-3 w-3" /></button>
                  )}
                  <Badge variant={SMS_VARIANT[m.status]}>{SMS_STATUS_LABELS[m.status]}</Badge>
                </span>
              </div>
              <p className="text-gray-600">{m.text}</p>
              <p className="mt-1 text-gray-400">{formatDateTime(m.sentAt ?? m.createdAt)}{m.error ? ` · ${m.error}` : ''}</p>
            </div>
          ))}
        </div>
      ) : <p className="text-center text-sm text-gray-400">SMS yuborilmagan</p>}
    </Card>
  );
}
