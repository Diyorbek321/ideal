import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { paymentsApi } from '@/api';
import type { OrderDetail, PaymentMethod } from '@/types';
import { KIND_LABELS, METHOD_LABELS, options } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { formatCurrency, formatDateTime, parseMoney } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

export function PaymentsCard({ order }: { order: OrderDetail }) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('CASH');
  const [note, setNote] = React.useState('');
  const remaining = order.remainingAmount ?? 0;

  const refresh = () => invalidateOrderViews(qc);

  const create = useMutation({
    mutationFn: () => {
      const sum = parseMoney(amount);
      if (!sum) return Promise.reject(new Error('Summani raqam bilan kiriting'));
      return paymentsApi.create({ orderId: order.id, amount: sum, method, note: note || undefined });
    },
    onSuccess: () => { toast.success('To\'lov qabul qilindi'); setOpen(false); refresh(); },
    onError: toast.error,
  });
  const remove = useMutation({
    mutationFn: (id: string) => paymentsApi.remove(id),
    onSuccess: () => { toast.success('To\'lov bekor qilindi'); refresh(); },
    onError: toast.error,
  });

  const openModal = () => { setAmount(String(remaining)); setMethod('CASH'); setNote(''); setOpen(true); };

  return (
    <Card
      title="To'lovlar"
      actions={remaining > 0 && order.status !== 'BEKOR_QILINDI' ? <Button size="sm" onClick={openModal}><Plus className="mr-1 h-4 w-4" />To'lov</Button> : undefined}
    >
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Jami</p><p className="font-bold">{formatCurrency(order.totalAmount)}</p></div>
        <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">To'langan</p><p className="font-bold text-emerald-700">{formatCurrency(order.paidAmount)}</p></div>
        <div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-red-700">Qoldiq</p><p className="font-bold text-red-700">{formatCurrency(remaining)}</p></div>
      </div>
      {order.payments?.length ? (
        <div className="divide-y divide-gray-50">
          {order.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-semibold text-gray-900">{formatCurrency(p.amount)} <span className="font-normal text-gray-500">· {METHOD_LABELS[p.method]} · {KIND_LABELS[p.kind]}</span></p>
                <p className="text-xs text-gray-400">{formatDateTime(p.createdAt)} · {p.user?.fullName}</p>
              </div>
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => window.confirm('To\'lovni bekor qilasizmi?') && remove.mutate(p.id)}
                  className="text-gray-300 hover:text-red-600"
                  aria-label="To'lovni bekor qilish"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : <p className="text-center text-sm text-gray-400">To'lovlar yo'q</p>}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="To'lov qabul qilish"
        footer={(
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button isLoading={create.isPending} onClick={() => create.mutate()}>Qabul qilish</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Input label={`Summa (qoldiq: ${formatCurrency(remaining)})`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          <Select label="To'lov usuli" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={options(METHOD_LABELS)} />
          <Input label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>
    </Card>
  );
}
