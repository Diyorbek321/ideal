import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { paymentsApi } from '@/api';
import type { BalanceEntry, PaymentMethod } from '@/types';
import { KIND_LABELS, METHOD_LABELS, options } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { formatCurrency, formatDateTime, parseMoney } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Empty } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

type Mode = 'deposit' | 'refund';

const MODE_TEXT: Record<Mode, { title: string; submit: string; success: string; note: string }> = {
  deposit: {
    title: 'Oldindan to\'lov qabul qilish',
    submit: 'Qabul qilish',
    success: 'Oldindan to\'lov balansga tushdi',
    note: 'Izoh (shartnoma yoki to\'lov topshirig\'i raqami)',
  },
  refund: {
    title: 'Balans qoldig\'ini qaytarish',
    submit: 'Qaytarish',
    success: 'Balans qoldig\'i qaytarildi',
    note: 'Sabab',
  },
};

/**
 * Mijoz balansi: tashkilot oldindan o'tkazgan pul. Yangi buyurtma summasi shu puldan avtomatik ayiriladi,
 * pul tushganda qarzi bor buyurtmalar eskisidan boshlab yopiladi.
 */
export function ClientBalanceCard({ clientId }: { clientId: string }) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['client-balance', clientId], queryFn: () => paymentsApi.balance(clientId) });
  const [mode, setMode] = React.useState<Mode | null>(null);
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('TRANSFER');
  const [note, setNote] = React.useState('');
  const balance = data?.balance ?? 0;

  const submit = useMutation({
    mutationFn: () => {
      const sum = parseMoney(amount);
      if (!sum) return Promise.reject(new Error('Summani raqam bilan kiriting'));
      const body = { amount: sum, method, note: note.trim() || undefined };
      return mode === 'refund' ? paymentsApi.balanceRefund(clientId, body) : paymentsApi.deposit(clientId, body);
    },
    onSuccess: (r) => {
      const applied = 'appliedToOrders' in r ? Number(r.appliedToOrders) || 0 : 0;
      toast.success(applied
        ? `${MODE_TEXT.deposit.success}. Qarzi bor buyurtmalarga ${formatCurrency(applied)} avtomatik ayirildi`
        : MODE_TEXT[mode ?? 'deposit'].success);
      setMode(null);
      invalidateOrderViews(qc);
    },
    onError: toast.error,
  });
  const remove = useMutation({
    mutationFn: (id: string) => paymentsApi.remove(id),
    onSuccess: () => { toast.success('Yozuv o\'chirildi'); invalidateOrderViews(qc); },
    onError: toast.error,
  });

  const open = (m: Mode) => {
    setMode(m);
    setAmount(m === 'refund' ? String(balance) : '');
    setMethod('TRANSFER');
    setNote('');
  };

  return (
    <Card
      title="Balans (oldindan to'lov)"
      actions={(
        <div className="flex gap-2">
          {balance > 0 && <Button size="sm" variant="ghost" onClick={() => open('refund')}><Undo2 className="h-4 w-4" />Qaytarish</Button>}
          <Button size="sm" onClick={() => open('deposit')}><Plus className="h-4 w-4" />Oldindan to'lov</Button>
        </div>
      )}
    >
      <div className="mb-4 rounded-lg bg-sky-50 p-3 text-center">
        <p className="text-xs text-sky-700">Balansda</p>
        <p className="text-xl font-black text-sky-700">{formatCurrency(balance)}</p>
      </div>
      {data?.entries.length ? (
        <div className="divide-y divide-gray-50 text-sm">
          {data.entries.map((e) => (
            <BalanceRow key={e.id} entry={e} canDelete={user.role === 'ADMIN'} onDelete={() => remove.mutate(e.id)} />
          ))}
        </div>
      ) : <Empty text="Oldindan to'lov yo'q. Tashkilot pul o'tkazsa, shu yerga kiriting — keyin buyurtmalar shu puldan yopiladi." />}

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={MODE_TEXT[mode ?? 'deposit'].title}
        footer={(
          <>
            <Button variant="outline" onClick={() => setMode(null)}>Bekor qilish</Button>
            <Button isLoading={submit.isPending} onClick={() => submit.mutate()}>{MODE_TEXT[mode ?? 'deposit'].submit}</Button>
          </>
        )}
      >
        <div className="space-y-4">
          {mode === 'deposit' && (
            <p className="text-sm text-gray-600">Pul bugungi kassaga tushum bo'lib yoziladi va mijoz balansida turadi. Qarzi bor buyurtmalar shu puldan darhol avtomatik yopiladi, yangi buyurtmalar ham o'zi ayiriladi.</p>
          )}
          <Input
            label={mode === 'refund' ? `Summa (ko'pi bilan: ${formatCurrency(balance)})` : 'Summa'}
            money inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
          />
          <Select label={mode === 'refund' ? 'Qanday qaytarildi' : 'To\'lov usuli'} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={options(METHOD_LABELS)} />
          <Input label={MODE_TEXT[mode ?? 'deposit'].note} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>
    </Card>
  );
}

interface BalanceRowProps { entry: BalanceEntry; canDelete: boolean; onDelete: () => void }

function BalanceRow({ entry: e, canDelete, onDelete }: BalanceRowProps) {
  // Buyurtmaga yechilgan yozuv buyurtma sahifasidan bekor qilinadi (juft yozuv bilan birga)
  const deletable = canDelete && e.kind !== 'BALANCE_USE';
  const title = e.kind === 'BALANCE_USE' && e.orderNumber ? `№${e.orderNumber} buyurtmaga` : KIND_LABELS[e.kind];
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-gray-900">
          {title}
          {e.kind !== 'BALANCE_USE' && <span className="font-normal text-gray-500"> · {METHOD_LABELS[e.method]}</span>}
        </p>
        <p className="text-xs text-gray-400">{formatDateTime(e.date)} · {e.user}{e.note && e.kind !== 'BALANCE_USE' && ` · ${e.note}`}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={e.amount < 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
          {e.amount < 0 ? `− ${formatCurrency(-e.amount)}` : `+ ${formatCurrency(e.amount)}`}
        </span>
        {deletable && (
          <button
            onClick={() => window.confirm('Bu yozuvni o\'chirasizmi?') && onDelete()}
            className="text-gray-300 hover:text-red-600"
            aria-label="Yozuvni o'chirish"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
