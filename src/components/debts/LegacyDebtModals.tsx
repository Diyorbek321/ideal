import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/api';
import type { Client, Debt, PaymentMethod } from '@/types';
import { METHOD_LABELS, options } from '@/lib/labels';
import { formatCurrency, parseMoney } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { confirmBigAmount } from '@/lib/bigAmount';
import { ClientPicker } from '@/components/clients/ClientPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

const today = () => new Date().toISOString().slice(0, 10);

interface FormProps {
  open: boolean;
  onClose: () => void;
  /** Mijoz sahifasidan ochilganda mijoz oldindan tanlangan */
  client?: Pick<Client, 'id' | 'name'> | null;
}

/** ERP'dan oldingi (daftardagi) qarzni kiritish — buyurtma yaratilmaydi, aylanmaga kirmaydi */
export function LegacyDebtFormModal({ open, onClose, client: preset = null }: FormProps) {
  const toast = useToast();
  const qc = useQueryClient();
  const [client, setClient] = React.useState<Pick<Client, 'id' | 'name'> | null>(preset);
  const [amount, setAmount] = React.useState('');
  const [debtDate, setDebtDate] = React.useState(today());
  const [dueDate, setDueDate] = React.useState('');
  const [note, setNote] = React.useState('');

  // Faqat oyna ochilganda tozalanadi — mijoz ma'lumoti qayta yuklansa kiritilgan matn o'chmasin
  const presetId = preset?.id;
  React.useEffect(() => {
    if (!open) return;
    setClient(preset);
    setAmount('');
    setDebtDate(today());
    setDueDate('');
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetId]);

  const save = useMutation({
    mutationFn: () => {
      const sum = parseMoney(amount);
      if (!client) return Promise.reject(new Error('Mijozni tanlang'));
      if (!sum) return Promise.reject(new Error('Qarz summasini kiriting'));
      if (!confirmBigAmount(sum, 'Eski qarz')) return Promise.reject(new Error('Bekor qilindi'));
      return paymentsApi.createLegacy({ clientId: client.id, amount: sum, debtDate, dueDate: dueDate || null, note: note.trim() || null });
    },
    onSuccess: (d) => {
      toast.success(`Eski qarz qo'shildi: ${d.number}`);
      invalidateOrderViews(qc);
      onClose();
    },
    onError: toast.error,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eski qarz qo'shish"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          ERP'dan oldingi daftardagi qarz. Buyurtma ochilmaydi va oylik aylanmaga qo'shilmaydi — faqat qarzdorlar ro'yxatida turadi.
          Mijoz to'laganda pul shu kungi kassaga tushadi.
        </p>
        <ClientPicker value={client} onChange={setClient} />
        <Input label="Hozirgi qarz summasi *" money inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Qarz sanasi *" type="date" max={today()} value={debtDate} onChange={(e) => setDebtDate(e.target.value)} />
          <Input label="To'lash muddati" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Input label="Izoh (nima uchun qarz)" placeholder="Masalan: 2025-yil banner, daftar 12-bet" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

interface PayProps {
  debt: Debt | null;
  onClose: () => void;
}

/** Eski qarz bo'yicha to'lov qabul qilish */
export function LegacyPayModal({ debt, onClose }: PayProps) {
  const toast = useToast();
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('CASH');
  const [note, setNote] = React.useState('');

  const debtId = debt?.legacyDebtId;
  React.useEffect(() => {
    if (!debt) return;
    setAmount(String(debt.remaining));
    setMethod('CASH');
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtId]);

  const pay = useMutation({
    mutationFn: () => {
      const sum = parseMoney(amount);
      if (!debt?.legacyDebtId) return Promise.reject(new Error('Qarz tanlanmagan'));
      if (!sum) return Promise.reject(new Error('Summani kiriting'));
      return paymentsApi.payLegacy(debt.legacyDebtId, { amount: sum, method, note: note.trim() || undefined });
    },
    onSuccess: () => {
      toast.success('To\'lov qabul qilindi');
      invalidateOrderViews(qc);
      onClose();
    },
    onError: toast.error,
  });

  return (
    <Modal
      open={!!debt}
      onClose={onClose}
      title={debt ? `${debt.orderNumber} — to'lov` : ''}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={pay.isPending} onClick={() => pay.mutate()}>Qabul qilish</Button>
        </>
      )}
    >
      {debt && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{debt.client.name} · qoldiq <b>{formatCurrency(debt.remaining)}</b></p>
          <Input label="Summa" money inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          <Select label="To'lov usuli" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={options(METHOD_LABELS)} />
          <Input label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
