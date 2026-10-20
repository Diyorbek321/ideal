import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ordersApi } from '@/api';
import type { OrderDetail, OrderStatus } from '@/types';
import { ORDER_FLOW, STATUS_LABELS } from '@/lib/labels';
import { isFinance, useUser } from '@/lib/auth';
import { cn, formatHours } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

// Faqat server ruxsat bergan keyingi bosqichlar tugma sifatida chiqadi
export function StatusPanel({ order }: { order: OrderDetail }) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const change = useMutation({
    mutationFn: ({ status, comment }: { status: OrderStatus; comment?: string }) => ordersApi.changeStatus(order.id, status, comment),
    onSuccess: (_, v) => {
      toast.success(`Status: ${STATUS_LABELS[v.status]}`);
      setCancelOpen(false);
      invalidateOrderViews(qc);
    },
    onError: toast.error,
  });

  const flow = order.status === 'YETKAZISHDA' ? ORDER_FLOW.map((s) => (s === 'ORNATISHDA' ? 'YETKAZISHDA' : s)) : ORDER_FLOW;
  const idx = flow.indexOf(order.status);
  const finished = order.status === 'YAKUNLANDI';
  const next = order.allowedNextStatuses.filter((s) => s !== 'BEKOR_QILINDI');
  const canAct = isFinance(user.role);

  return (
    <Card className="p-6">
      {order.status === 'BEKOR_QILINDI' ? (
        <p className="flex items-center justify-center font-bold text-red-600"><XCircle className="mr-2 h-5 w-5" />Buyurtma bekor qilingan</p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="relative flex min-w-[640px] items-start justify-between">
            <div className="absolute left-0 top-4 z-0 h-0.5 w-full bg-gray-100" />
            <div className="absolute left-0 top-4 z-0 h-0.5 bg-blue-500 transition-all" style={{ width: `${(Math.max(idx, 0) / (flow.length - 1)) * 100}%` }} />
            {flow.map((s, i) => (
              <div key={s} className="relative z-10 flex w-20 flex-col items-center">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  i < idx || finished ? 'border-blue-500 bg-blue-500 text-white' : i === idx ? 'border-blue-500 bg-white text-blue-500' : 'border-gray-200 bg-white text-gray-300',
                )}>
                  {i < idx || finished ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <span className={cn('mt-2 text-center text-[10px] font-bold uppercase leading-tight', i === idx ? 'text-blue-600' : 'text-gray-400')}>
                  {STATUS_LABELS[s]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {order.sla.slaHours !== null && (
          <span className={cn('text-sm', order.sla.isOverdue ? 'font-bold text-red-600' : 'text-gray-500')}>
            Shu bosqichda: {formatHours(order.sla.hoursInStatus)} (me'yor {order.sla.slaHours} soat)
          </span>
        )}
        {canAct && next.map((s) => (
          <Button key={s} isLoading={change.isPending && change.variables?.status === s} onClick={() => change.mutate({ status: s })}>
            → {STATUS_LABELS[s]}
          </Button>
        ))}
        {canAct && order.allowedNextStatuses.includes('BEKOR_QILINDI') && (
          <Button variant="ghost" className="text-red-600" onClick={() => setCancelOpen(true)}>Bekor qilish</Button>
        )}
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Buyurtmani bekor qilish"
        footer={(
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Yo'q</Button>
            <Button variant="danger" isLoading={change.isPending} onClick={() => change.mutate({ status: 'BEKOR_QILINDI', comment: reason || undefined })}>
              Bekor qilish
            </Button>
          </>
        )}
      >
        <p className="mb-4 text-sm text-gray-600">Ochiq ishlab chiqarish vazifalari o'chiriladi. Bu amalni qaytarib bo'lmaydi.</p>
        <Textarea label="Sabab" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </Modal>
    </Card>
  );
}
