import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock } from 'lucide-react';
import { ordersApi } from '@/api';
import type { Order, OrderStatus } from '@/types';
import { KANBAN_COLUMNS, SOURCE_LABELS, STATUS_LABELS } from '@/lib/labels';
import { cn, deadlineText, formatCurrency, formatHours } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

// Kartani boshqa ustunga sudrab status o'zgartiriladi; ruxsat etilmagan o'tishni server rad etadi
export function OrdersKanban({ orders }: { orders: Order[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<OrderStatus | null>(null);

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => ordersApi.changeStatus(id, status),
    onSuccess: (_, v) => {
      toast.success(`Status: ${STATUS_LABELS[v.status]}`);
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: toast.error,
  });

  const drop = (status: OrderStatus) => {
    const order = orders.find((o) => o.id === dragId);
    setOver(null);
    setDragId(null);
    if (order && order.status !== status) move.mutate({ id: order.id, status });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((status) => {
        const list = orders.filter((o) => o.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setOver(status); }}
            onDragLeave={() => setOver((s) => (s === status ? null : s))}
            onDrop={() => drop(status)}
            className={cn('w-72 flex-shrink-0 space-y-3 rounded-xl p-2 transition-colors', over === status && 'bg-brand-50')}
          >
            <h3 className="flex items-center px-2 text-xs font-bold uppercase tracking-wider text-gray-700">
              {STATUS_LABELS[status]}
              <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-600">{list.length}</span>
            </h3>
            <div className="min-h-[400px] space-y-3">
              {list.map((o) => {
                const dl = deadlineText(o.deadline);
                return (
                  <Card
                    key={o.id}
                    draggable
                    onDragStart={() => setDragId(o.id)}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className={cn(
                      'cursor-grab border-l-4 p-4 hover:shadow-md active:cursor-grabbing',
                      o.sla.isOverdue || o.isLate ? 'border-l-red-500' : 'border-l-brand-400',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-sm font-bold text-brand-600">{o.number}</span>
                      <span className="text-[10px] font-medium uppercase text-gray-400">{SOURCE_LABELS[o.source]}</span>
                    </div>
                    <p className="mb-3 text-sm font-medium text-gray-900">{o.client.name}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900">{o.totalAmount !== undefined ? formatCurrency(o.totalAmount) : ''}</span>
                      <span className={cn('flex items-center', o.sla.isOverdue ? 'font-bold text-red-600' : 'text-gray-500')}>
                        {o.sla.isOverdue ? <AlertTriangle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                        {formatHours(o.sla.hoursInStatus)}
                      </span>
                    </div>
                    {dl && <p className={cn('mt-2 text-[11px]', dl.late ? 'font-bold text-red-600' : 'text-gray-400')}>Muddat: {dl.text}</p>}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
