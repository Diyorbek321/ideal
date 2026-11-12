import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type AdvanceRow } from '@/api';
import type { PaymentMethod } from '@/types';
import { METHOD_LABELS, options } from '@/lib/labels';
import { formatCurrency, parseMoney } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

/** Adashib yozilgan avansni tuzatish: naqd ↔ karta, summa, izoh. Kassadagi «Ish haqi» xarajati ham birga o'zgaradi */
export function EditAdvanceModal({ row, onClose }: { row: AdvanceRow; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = React.useState({
    amount: String(row.amount), method: (row.method ?? 'CASH') as PaymentMethod, reason: row.reason ?? '',
  });
  const amount = parseMoney(f.amount);

  const save = useMutation({
    mutationFn: () => payrollApi.updateAdvance(row.id, {
      ...(amount !== row.amount && { amount: amount! }),
      method: f.method,
      reason: f.reason.trim() || null,
    }),
    onSuccess: (r) => {
      toast.success(`Avans tuzatildi: ${formatCurrency(r.amount)} · ${METHOD_LABELS[r.method]}`);
      for (const key of ['payroll', 'expenses', 'finance', 'summary']) void qc.invalidateQueries({ queryKey: [key] });
      onClose();
    },
    onError: toast.error,
  });

  return (
    <Modal open onClose={onClose} title={`Avansni tahrirlash — ${row.userName}`}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button disabled={!amount} isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </>
      )}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Summa" money value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <Select label="Usul" value={f.method} options={options(METHOD_LABELS)} onChange={(e) => setF({ ...f, method: e.target.value as PaymentMethod })} />
        <div className="sm:col-span-2">
          <Input label="Izoh" value={f.reason} maxLength={300} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="ixtiyoriy" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Oylik to'langan oyda summani o'zgartirib bo'lmaydi — faqat to'lov usulini.</p>
    </Modal>
  );
}
