import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { expensesApi } from '@/api';
import type { Expense, PaymentMethod } from '@/types';
import { METHOD_LABELS } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { cn, parseMoney } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export const EXPENSE_CATEGORIES = ['Material xaridi', 'Ijara', 'Kommunal', 'Transport', 'Uskuna ta\'miri', 'Soliq', 'Boshqa'];
// Xarajat tenderdan to'lanmaydi — formada faqat shu uchtasi
export const EXPENSE_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER'];

// "2026-10-22" ↔ ISO. Kun o'rtasi olinadi — vaqt mintaqasi sanani bir kunga surib yubormasin
const toDateInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromDateInput = (v: string) => new Date(`${v}T12:00:00`).toISOString();

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Berilsa — tahrirlash, aks holda yangi xarajat */
  expense?: Expense | null;
}

export function ExpenseFormModal({ open, onClose, expense }: ExpenseFormModalProps) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const blank = { category: EXPENSE_CATEGORIES[0]!, amount: '', method: 'CASH' as PaymentMethod, note: '', date: toDateInput(new Date().toISOString()) };
  const [form, setForm] = React.useState(blank);

  React.useEffect(() => {
    if (!open) return;
    setForm(expense
      ? { category: expense.category, amount: String(expense.amount), method: expense.method, note: expense.note ?? '', date: toDateInput(expense.date) }
      : blank);
  }, [open, expense]);

  const used = useQuery({ queryKey: ['expenses', 'categories'], queryFn: expensesApi.categories, enabled: open, staleTime: 60_000 });
  const suggestions = [...new Set([...(used.data ?? []), ...EXPENSE_CATEGORIES])];

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['expenses'] });
    void qc.invalidateQueries({ queryKey: ['summary'] });
  };
  const save = useMutation({
    mutationFn: () => {
      const amount = parseMoney(form.amount);
      if (!amount) return Promise.reject(new Error('Summani raqam bilan kiriting'));
      if (!form.category.trim()) return Promise.reject(new Error('Kategoriyani kiriting'));
      const body = { category: form.category.trim(), amount, method: form.method, note: form.note.trim() || null, date: fromDateInput(form.date) };
      return expense ? expensesApi.update(expense.id, body) : expensesApi.create(body);
    },
    onSuccess: () => { toast.success(expense ? 'Xarajat saqlandi' : 'Xarajat qo\'shildi'); refresh(); onClose(); },
    onError: toast.error,
  });
  const remove = useMutation({
    mutationFn: () => expensesApi.remove(expense!.id),
    onSuccess: () => { toast.success('Xarajat o\'chirildi'); refresh(); onClose(); },
    onError: toast.error,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? 'Xarajatni tahrirlash' : 'Yangi xarajat'}
      footer={(
        <>
          {expense && user.role === 'ADMIN' && (
            <Button variant="ghost" className="mr-auto text-red-600" isLoading={remove.isPending}
              onClick={() => window.confirm('Xarajatni o\'chirasizmi?') && remove.mutate()}>
              <Trash2 className="h-4 w-4" />O'chirish
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </>
      )}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Input label="Summa (so'm)" inputMode="numeric" placeholder="Masalan: 250 000" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
        <div className="space-y-1.5">
          <label htmlFor="exp-category" className="block text-sm font-medium text-gray-700">Nimaga</label>
          <Input id="exp-category" list="exp-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <datalist id="exp-cats">{suggestions.map((c) => <option key={c} value={c} />)}</datalist>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.slice(0, 8).map((c) => (
              <button key={c} type="button" onClick={() => setForm({ ...form, category: c })}
                className={cn('rounded-full border px-3 py-1 text-xs transition-colors',
                  form.category === c ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:border-gray-400')}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-gray-700">To'lov usuli</span>
          <div className="grid grid-cols-3 gap-2">
            {EXPENSE_METHODS.map((m) => (
              <button key={m} type="button" onClick={() => setForm({ ...form, method: m })} aria-pressed={form.method === m}
                className={cn('h-10 rounded-xl border text-sm font-medium transition-colors',
                  form.method === m ? 'border-gray-900 bg-brand-400 text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')}>
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        <Input label="Sana" type="date" value={form.date} max={toDateInput(new Date().toISOString())}
          onChange={(e) => e.target.value && setForm({ ...form, date: e.target.value })} />
        <Input label="Izoh" placeholder="Masalan: akril 3 mm, 2 list" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
