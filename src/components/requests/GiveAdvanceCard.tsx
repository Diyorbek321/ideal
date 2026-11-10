import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollApi, usersApi } from '@/api';
import type { PaymentMethod } from '@/types';
import { useUser } from '@/lib/auth';
import { METHOD_LABELS, ROLE_LABELS, options } from '@/lib/labels';
import { formatCurrency, parseMoney } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

const blank = { userId: '', amount: '', method: 'CASH' as PaymentMethod, reason: '' };

/** Xodimga avans berish — direktor va menejer. Joriy oy oyligidan ushlanadi, "Ish haqi" xarajati yoziladi */
export function GiveAdvanceCard() {
  const me = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = React.useState(blank);
  const { data: users } = useQuery({ queryKey: ['users', 'active'], queryFn: () => usersApi.list({ active: true }) });
  const staff = (users ?? []).filter((u) => u.id !== me.id);
  const amount = parseMoney(f.amount);

  const give = useMutation({
    mutationFn: () => payrollApi.giveAdvance({ userId: f.userId, amount: amount!, method: f.method, reason: f.reason.trim() || undefined }),
    onSuccess: (r) => {
      const name = staff.find((u) => u.id === r.userId)?.fullName ?? 'Xodim';
      toast.success(`${name}ga ${formatCurrency(r.amount)} avans yozildi`);
      setF(blank);
      for (const key of ['payroll', 'expenses', 'finance']) void qc.invalidateQueries({ queryKey: [key] });
    },
    onError: toast.error,
  });

  return (
    <Card title="Avans berish" description="Pul qo'lga berilganda yozing — shu oy oyligidan ushlanadi va kassada «Ish haqi» xarajati bo'ladi">
      <form className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => { e.preventDefault(); if (f.userId && amount) give.mutate(); }}>
        <div className="lg:col-span-2">
          <Select label="Xodim" value={f.userId} placeholder="Tanlang" onChange={(e) => setF({ ...f, userId: e.target.value })}
            options={staff.map((u) => ({ value: u.id, label: `${u.fullName} · ${ROLE_LABELS[u.role]}` }))} />
        </div>
        <Input label="Summa" money value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <Select label="Usul" value={f.method} options={options(METHOD_LABELS)} onChange={(e) => setF({ ...f, method: e.target.value as PaymentMethod })} />
        <Input label="Izoh" value={f.reason} maxLength={300} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="ixtiyoriy" />
        <div className="sm:col-span-2 lg:col-span-5">
          <Button type="submit" disabled={!f.userId || !amount} isLoading={give.isPending}>Avans berish</Button>
        </div>
      </form>
    </Card>
  );
}
