import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Clock, CreditCard, MessageSquare, Palette, Printer, Truck } from 'lucide-react';
import { ordersApi } from '@/api';
import type { OrderEvent, OrderEventType } from '@/types';
import { STATUS_LABELS } from '@/lib/labels';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

const ICONS: Record<OrderEventType, typeof Clock> = {
  CREATED: Clock, STATUS_CHANGE: ArrowRight, COMMENT: MessageSquare, PAYMENT: CreditCard,
  DESIGN: Palette, PRODUCTION: Printer, INSTALLATION: Truck, UPDATED: Clock,
};

function eventText(e: OrderEvent) {
  if (e.type === 'CREATED') return 'Buyurtma yaratildi';
  if (e.type === 'STATUS_CHANGE') return `${e.fromStatus ? STATUS_LABELS[e.fromStatus] : ''} → ${e.toStatus ? STATUS_LABELS[e.toStatus] : ''}`;
  return e.message ?? '';
}

export function TimelineCard({ orderId, events }: { orderId: string; events: OrderEvent[] }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [text, setText] = React.useState('');
  const comment = useMutation({
    mutationFn: () => ordersApi.comment(orderId, text.trim()),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['order', orderId] }); },
    onError: toast.error,
  });

  return (
    <Card title="Tarix va izohlar">
      <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) comment.mutate(); }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ichki izoh yozing..."
          className="h-10 flex-1 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" isLoading={comment.isPending} disabled={!text.trim()}>Yozish</Button>
      </form>
      <div className="space-y-4">
        {[...events].reverse().map((e) => {
          const Icon = ICONS[e.type];
          const isComment = e.type === 'COMMENT';
          return (
            <div key={e.id} className="flex gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isComment ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className={isComment ? 'flex-1 rounded-lg border border-amber-100 bg-amber-50 p-3' : 'flex-1'}>
                <p className={`text-sm ${isComment ? 'text-amber-900' : 'font-medium text-gray-900'}`}>{eventText(e)}</p>
                <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(e.createdAt)} · {e.user?.fullName ?? 'Mijoz / tizim'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
