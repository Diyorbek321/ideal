import React from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, RotateCcw, Search } from 'lucide-react';
import { smsApi } from '@/api';
import { SMS_EVENT_LABELS, SMS_STATUS_LABELS, options } from '@/lib/labels';
import { cn, formatDateTime, formatPhone } from '@/lib/utils';
import { SMS_VARIANT } from '@/components/orders/detail/SmsCard';
import { useDebounced } from '@/components/clients/ClientPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 30;

/** Yuborilgan SMSlar: holat, hodisa va raqam/ism/matn bo'yicha qidiruv */
export function SmsLog() {
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = React.useState('');
  const [event, setEvent] = React.useState('');
  const [search, setSearch] = React.useState('');
  const q = useDebounced(search.trim());
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setPage(1), [status, event, q]);

  const log = useQuery({
    queryKey: ['sms', 'log', status, event, q, page],
    queryFn: () => smsApi.messages({ status: status || undefined, event: event || undefined, q: q || undefined, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const retry = useMutation({
    mutationFn: smsApi.retry,
    onSuccess: () => { toast.success('Qayta navbatga qo\'yildi'); qc.invalidateQueries({ queryKey: ['sms'] }); },
    onError: toast.error,
  });
  const data = log.data;
  const pages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;

  return (
    <Card>
      <div className="grid grid-cols-1 gap-3 border-b border-gray-100 p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Raqam, mijoz yoki matn..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={event} onChange={(e) => setEvent(e.target.value)} placeholder="Barcha hodisalar" options={options(SMS_EVENT_LABELS)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Barcha holatlar" options={options(SMS_STATUS_LABELS)} />
      </div>
      {log.error ? <ErrorState error={log.error} onRetry={log.refetch} /> : log.isLoading || !data ? <Loading rows={6} /> : data.data.length === 0 ? (
        <Empty icon={MessageSquare} text="SMS topilmadi" />
      ) : (
        <ul className={cn('divide-y divide-gray-50 px-4', log.isFetching && 'opacity-60')}>
          {data.data.map((m) => (
            <li key={m.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-900">
                  {formatPhone(m.phone)} · {m.client ? <Link to={`/clients/${m.client.id}`} className="hover:underline">{m.client.name}</Link> : '—'}
                  {m.order && <Link to={`/orders/${m.order.id}`} className="ml-2 text-brand-600 hover:underline">{m.order.number}</Link>}
                </span>
                <span className="flex items-center gap-2">
                  {m.status === 'FAILED' && (
                    <button type="button" onClick={() => retry.mutate(m.id)} className="text-brand-600" aria-label="Qayta yuborish" title="Qayta yuborish">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  <Badge variant={SMS_VARIANT[m.status]}>{SMS_STATUS_LABELS[m.status]}</Badge>
                </span>
              </div>
              <p className="mt-1 break-words text-gray-600">{m.text}</p>
              <p className="mt-1 text-xs text-gray-400">
                {SMS_EVENT_LABELS[m.event]} · {formatDateTime(m.sentAt ?? m.createdAt)}
                {m.error && <span className="text-red-600"> · {m.error}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-gray-100 p-4">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Oldingi</Button>
          <span className="text-sm text-gray-600">{page} / {pages} · jami {data.meta.total}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Keyingi</Button>
        </div>
      )}
    </Card>
  );
}
