import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Undo2, Wallet } from 'lucide-react';
import { paymentsApi } from '@/api';
import type { OrderDetail, Payment, PaymentMethod } from '@/types';
import { KIND_LABELS, METHOD_LABELS, options } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { formatCurrency, formatDateTime, parseMoney } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { confirmBigAmount } from '@/lib/bigAmount';
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
  // null — yangi to'lov, aks holda shu to'lov tahrirlanadi
  const [editing, setEditing] = React.useState<Payment | null>(null);
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('CASH');
  const [note, setNote] = React.useState('');
  // Mijozga pul qaytarish oynasi (bekor qilingan yoki ortiqcha to'langan buyurtma)
  const [refunding, setRefunding] = React.useState(false);
  // Mijozning oldindan to'lagan pulidan (balansidan) buyurtmani yopish
  const [fromBalance, setFromBalance] = React.useState(false);
  const { data: ledger } = useQuery({
    queryKey: ['client-balance', order.clientId],
    queryFn: () => paymentsApi.balance(order.clientId),
  });
  const clientBalance = ledger?.balance ?? 0;
  const remaining = order.remainingAmount ?? 0;
  const paid = order.paidAmount ?? 0;

  const refresh = () => invalidateOrderViews(qc);

  const isAdmin = user.role === 'ADMIN';
  const create = useMutation({
    mutationFn: () => {
      const sum = parseMoney(amount);
      if (!sum) return Promise.reject(new Error('Summani raqam bilan kiriting'));
      if (fromBalance) return paymentsApi.fromBalance(order.id, sum);
      if (refunding) return paymentsApi.refund(order.id, { amount: sum, method, note: note.trim() || undefined });
      if (editing) {
        return paymentsApi.update(editing.id, { ...(sum !== editing.amount && { amount: sum }), method, note: note.trim() || null });
      }
      return paymentsApi.create({ orderId: order.id, amount: sum, method, note: note || undefined });
    },
    onSuccess: () => {
      toast.success(fromBalance ? 'Balansdan to\'landi' : refunding ? 'Pul qaytarildi' : editing ? 'To\'lov tuzatildi' : 'To\'lov qabul qilindi');
      setOpen(false);
      refresh();
    },
    onError: toast.error,
  });
  const remove = useMutation({
    mutationFn: (id: string) => paymentsApi.remove(id),
    onSuccess: () => { toast.success('To\'lov bekor qilindi'); refresh(); },
    onError: toast.error,
  });

  const openModal = () => { setFromBalance(false); setRefunding(false); setEditing(null); setAmount(String(remaining)); setMethod('CASH'); setNote(''); setOpen(true); };
  const openEdit = (p: Payment) => { setFromBalance(false); setRefunding(false); setEditing(p); setAmount(String(p.amount)); setMethod(p.method); setNote(p.note ?? ''); setOpen(true); };
  const openRefund = () => { setFromBalance(false); setRefunding(true); setEditing(null); setAmount(String(paid)); setMethod('CASH'); setNote(''); setOpen(true); };
  const openFromBalance = () => {
    setFromBalance(true); setRefunding(false); setEditing(null);
    setAmount(String(Math.min(remaining, clientBalance))); setNote(''); setOpen(true);
  };
  const canPay = remaining > 0 && order.status !== 'BEKOR_QILINDI';
  // Tahrirda shu to'lovning o'zi ham qoldiqqa qaytadi; qaytarishda — to'langan summagacha; balansdan — qaysi biri kam bo'lsa
  const maxAmount = fromBalance ? Math.min(remaining, clientBalance) : refunding ? paid : remaining + (editing?.amount ?? 0);
  const canPayFromBalance = canPay && clientBalance > 0;

  return (
    <Card
      title="To'lovlar"
      actions={(canPay || paid > 0) ? (
        <div className="flex gap-2">
          {paid > 0 && (
            <Button size="sm" variant={order.status === 'BEKOR_QILINDI' ? 'primary' : 'ghost'} onClick={openRefund}>
              <Undo2 className="h-4 w-4" />Pul qaytarish
            </Button>
          )}
          {canPayFromBalance && (
            <Button size="sm" variant="outline" onClick={openFromBalance}>
              <Wallet className="h-4 w-4" />Balansdan ({formatCurrency(clientBalance)})
            </Button>
          )}
          {canPay && <Button size="sm" onClick={openModal}><Plus className="h-4 w-4" />To'lov</Button>}
        </div>
      ) : undefined}
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
                <p className={p.kind === 'REFUND' ? 'font-semibold text-red-600' : 'font-semibold text-gray-900'}>
                  {p.kind === 'REFUND' ? `− ${formatCurrency(-p.amount)}` : formatCurrency(p.amount)}{' '}
                  <span className="font-normal text-gray-500">· {METHOD_LABELS[p.method]} · {KIND_LABELS[p.kind]}</span>
                </p>
                <p className="text-xs text-gray-400">{formatDateTime(p.createdAt)} · {p.user?.fullName}{p.note && ` · ${p.note}`}</p>
              </div>
              <div className="flex items-center gap-3">
                {p.kind !== 'REFUND' && !p.transferId && (
                  <button onClick={() => openEdit(p)} className="text-gray-300 hover:text-gray-700" aria-label="To'lovni tahrirlash">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => window.confirm(confirmText(p)) && remove.mutate(p.id)}
                    className="text-gray-300 hover:text-red-600"
                    aria-label="To'lovni bekor qilish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-center text-sm text-gray-400">To'lovlar yo'q</p>}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={fromBalance ? 'Balansdan to\'lash' : refunding ? 'Mijozga pul qaytarish' : editing ? 'To\'lovni tuzatish' : 'To\'lov qabul qilish'}
        footer={(
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button isLoading={create.isPending} onClick={() => (refunding || confirmBigAmount(parseMoney(amount) ?? 0, 'To\'lov summasi')) && create.mutate()}>{fromBalance ? 'Balansdan to\'lash' : refunding ? 'Qaytarish' : editing ? 'Saqlash' : 'Qabul qilish'}</Button>
          </>
        )}
      >
        <div className="space-y-4">
          {fromBalance && (
            <p className="text-sm text-gray-600">
              Mijoz balansida <b>{formatCurrency(clientBalance)}</b> bor. Kassaga yangi pul tushmaydi — summa oldindan to'langan puldan buyurtmaga o'tadi.
              {clientBalance < remaining && ' Balans yetmaydi: qolgani qarz bo\'lib turadi.'}
            </p>
          )}
          {refunding && <p className="text-sm text-gray-600">Asl to'lov o'chmaydi — tarixda alohida "Qaytarildi" yozuvi paydo bo'ladi va kassadan ayiriladi.</p>}
          <Input
            label={`Summa (ko'pi bilan: ${formatCurrency(maxAmount)})`} money
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            // Summani faqat direktor tuzatadi; menejer usul va izohni o'zgartiradi
            disabled={!!editing && !isAdmin}
            autoFocus
          />
          {!fromBalance && <Select label={refunding ? 'Qanday qaytarildi' : 'To\'lov usuli'} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={options(METHOD_LABELS)} />}
          {!fromBalance && <Input label={refunding ? 'Sabab (masalan: mijoz buyurtmani bekor qildi)' : 'Izoh'} value={note} onChange={(e) => setNote(e.target.value)} />}
        </div>
      </Modal>
    </Card>
  );
}

function confirmText(p: Payment): string {
  if (p.transferId) return 'Balansdan to\'lovni bekor qilasizmi? Pul mijoz balansiga qaytadi.';
  return p.kind === 'REFUND' ? 'Pul qaytarish yozuvini o\'chirasizmi?' : 'To\'lovni bekor qilasizmi?';
}
