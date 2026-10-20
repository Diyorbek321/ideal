import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, CheckCircle2, Pencil, Plus, XCircle } from 'lucide-react';
import { payrollApi, usersApi } from '@/api';
import type { PayType, PayrollEntry, User, UserRole } from '@/types';
import { ROLE_LABELS, options } from '@/lib/labels';
import { currentPeriod, formatCurrency, formatNumber, formatPhone, parseMoney } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

// Bo'sh — 0; noto'g'ri raqam — NaN (yuborishdan oldin tekshiriladi)
const n = (s: string) => (s.trim() === '' ? 0 : parseMoney(s) ?? NaN);

function EmployeeModal({ user, open, onClose }: { user?: User; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = React.useState({ fullName: '', phone: '', role: 'INSTALLER' as UserRole, payType: 'FIXED' as PayType, salary: '', ratePerM2: '', password: '', isActive: true });

  React.useEffect(() => {
    if (!open) return;
    setF(user ? {
      fullName: user.fullName, phone: user.phone ?? '', role: user.role, payType: user.payType,
      salary: user.salary ? String(user.salary) : '', ratePerM2: user.ratePerM2 ? String(user.ratePerM2) : '', password: '', isActive: user.isActive,
    } : { fullName: '', phone: '+998 ', role: 'INSTALLER', payType: 'FIXED', salary: '', ratePerM2: '', password: '', isActive: true });
  }, [open, user]);

  const save = useMutation({
    mutationFn: () => {
      if (Number.isNaN(n(f.salary)) || Number.isNaN(n(f.ratePerM2))) throw new Error('Oylik yoki stavka noto\'g\'ri kiritilgan');
      const body = {
        fullName: f.fullName.trim(), phone: f.phone, role: f.role, payType: f.payType, isActive: f.isActive,
        salary: f.payType === 'FIXED' ? n(f.salary) : null,
        ratePerM2: f.payType === 'PER_M2' ? n(f.ratePerM2) : null,
        ...(f.password ? { password: f.password } : {}),
      };
      return user ? usersApi.update(user.id, body) : usersApi.create({ ...body, password: f.password });
    },
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: toast.error,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Xodimni tahrirlash' : 'Yangi xodim'}
      footer={<><Button variant="outline" onClick={onClose}>Bekor qilish</Button><Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></>}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Input label="F.I.Sh." value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
        <Input label="Telefon (login)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" />
        <Select label="Lavozim" value={f.role} onChange={(e) => {
          const role = e.target.value as UserRole;
          setF({ ...f, role, payType: role === 'DESIGNER' ? 'PER_M2' : 'FIXED' });
        }} options={options(ROLE_LABELS)} />
        <Select label="To'lov turi" value={f.payType} onChange={(e) => setF({ ...f, payType: e.target.value as PayType })} options={[{ value: 'FIXED', label: 'Belgilangan oylik' }, { value: 'PER_M2', label: 'Har m² uchun' }]} />
        {f.payType === 'FIXED'
          ? <Input label="Oylik (so'm)" inputMode="numeric" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value })} />
          : <Input label="1 m² uchun (so'm)" inputMode="numeric" value={f.ratePerM2} onChange={(e) => setF({ ...f, ratePerM2: e.target.value })} />}
        <div className="col-span-2"><Input label={user ? 'Yangi parol (o\'zgartirmasangiz bo\'sh qoldiring)' : 'Parol (kamida 8 belgi)'} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></div>
        {user && <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />Faol (o'chirilsa tizimga kira olmaydi)</label>}
      </div>
    </Modal>
  );
}

function PayrollRow({ e }: { e: PayrollEntry }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [adj, setAdj] = React.useState({ bonus: String(e.bonus || ''), fine: String(e.fine || ''), advance: String(e.advance || '') });
  const [open, setOpen] = React.useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['payroll'] });
  const save = useMutation({ mutationFn: () => [adj.bonus, adj.fine, adj.advance].some((v) => Number.isNaN(n(v))) ? Promise.reject(new Error('Summa noto\'g\'ri')) : payrollApi.adjust(e.id, { bonus: n(adj.bonus), fine: n(adj.fine), advance: n(adj.advance) }), onSuccess: refresh, onError: toast.error });
  const pay = useMutation({ mutationFn: () => payrollApi.pay(e.id), onSuccess: () => { toast.success('To\'landi'); refresh(); }, onError: toast.error });
  const dirty = n(adj.bonus) !== e.bonus || n(adj.fine) !== e.fine || n(adj.advance) !== e.advance;
  const field = (k: keyof typeof adj) => (
    <input value={adj[k]} disabled={e.isPaid} onChange={(ev) => setAdj({ ...adj, [k]: ev.target.value })} inputMode="numeric" className="h-8 w-28 rounded border border-gray-200 px-2 text-sm disabled:bg-gray-50" aria-label={k} />
  );

  return (
    <>
      <tr className="border-b border-gray-50">
        <td className="px-4 py-3">
          <button className="text-left" onClick={() => setOpen((o) => !o)}>
            <p className="font-bold text-gray-900">{e.user.fullName}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[e.user.role]}{e.user.payType === 'PER_M2' ? ` · ${formatNumber(e.m2Total, 2)} m²` : ''}</p>
          </button>
        </td>
        <td className="px-4 py-3 font-medium">{formatCurrency(e.baseAmount)}</td>
        <td className="px-4 py-3">{field('bonus')}</td>
        <td className="px-4 py-3">{field('fine')}</td>
        <td className="px-4 py-3">{field('advance')}</td>
        <td className="px-4 py-3 font-black text-blue-600">{formatCurrency(e.total)}</td>
        <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
          {e.isPaid ? <Badge variant="success">To'langan</Badge> : (
            <>
              {dirty && <Button size="sm" variant="outline" isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>}
              <Button size="sm" disabled={dirty} isLoading={pay.isPending} onClick={() => window.confirm(`${e.user.fullName}: ${formatCurrency(e.total)} to'landimi?`) && pay.mutate()}>To'lash</Button>
            </>
          )}
        </td>
      </tr>
      {open && e.details.length > 0 && (
        <tr className="bg-gray-50/50">
          <td colSpan={7} className="px-4 py-2 text-xs text-gray-600">
            {e.details.map((d) => `${d.orderNumber}: ${d.areaM2} m² = ${formatCurrency(d.amount)}`).join(' · ')}
          </td>
        </tr>
      )}
    </>
  );
}

export default function EmployeesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = React.useState(currentPeriod());
  const [editing, setEditing] = React.useState<User | null | undefined>(undefined);
  const users = useQuery({ queryKey: ['users', 'all'], queryFn: () => usersApi.list() });
  const payroll = useQuery({ queryKey: ['payroll', period], queryFn: () => payrollApi.list(period) });
  const calc = useMutation({
    mutationFn: () => payrollApi.calculate(period),
    onSuccess: () => { toast.success('Oylik hisoblandi'); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError: toast.error,
  });

  const entries = payroll.data?.entries ?? [];
  const paid = entries.filter((e) => e.isPaid).reduce((s, e) => s + e.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Xodimlar va oylik" actions={<Button onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" />Yangi xodim</Button>} />

      <Card>
        {users.error ? <ErrorState error={users.error} onRetry={users.refetch} /> : users.isLoading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 font-semibold">Xodim</th><th className="px-6 py-4 font-semibold">Lavozim</th>
                  <th className="px-6 py-4 font-semibold">Stavka / oylik</th><th className="px-6 py-4 font-semibold">Holat</th><th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {users.data?.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 font-bold uppercase text-blue-600">
                          {u.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                        </div>
                        <div><p className="font-bold text-gray-900">{u.fullName}</p><p className="text-xs text-gray-500">{formatPhone(u.phone)}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge variant="outline">{ROLE_LABELS[u.role]}</Badge></td>
                    <td className="px-6 py-4 font-bold text-gray-900">{u.payType === 'FIXED' ? formatCurrency(u.salary) : `${formatCurrency(u.ratePerM2)} / m²`}</td>
                    <td className="px-6 py-4">
                      {u.isActive
                        ? <span className="flex items-center font-medium text-emerald-600"><CheckCircle2 className="mr-1.5 h-4 w-4" />Faol</span>
                        : <span className="flex items-center font-medium text-red-500"><XCircle className="mr-1.5 h-4 w-4" />Nofaol</span>}
                    </td>
                    <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" onClick={() => setEditing(u)}><Pencil className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Oylik hisobi"
        description="Dizaynerlarga — mijoz tasdiqlagan m² × stavka; boshqalarga — belgilangan oylik"
        actions={(
          <div className="flex gap-2">
            <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="h-9 rounded-md border border-gray-300 px-2 text-sm" aria-label="Davr" />
            <Button size="sm" isLoading={calc.isPending} onClick={() => calc.mutate()}><Calculator className="mr-1 h-4 w-4" />Hisoblash</Button>
          </div>
        )}
      >
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-blue-50 p-3"><p className="text-xs text-blue-700">Jami</p><p className="text-xl font-black text-blue-700">{formatCurrency(payroll.data?.total)}</p></div>
          <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">To'langan</p><p className="text-xl font-black text-emerald-700">{formatCurrency(paid)}</p></div>
        </div>
        {payroll.isLoading ? <Loading /> : entries.length === 0 ? <Empty text={'Bu oy hali hisoblanmagan — "Hisoblash" tugmasini bosing'} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="px-4 py-2">Xodim</th><th className="px-4 py-2">Asosiy</th><th className="px-4 py-2">Bonus</th>
                  <th className="px-4 py-2">Jarima</th><th className="px-4 py-2">Avans</th><th className="px-4 py-2">Jami</th><th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>{entries.map((e) => <PayrollRow key={`${e.id}-${e.total}`} e={e} />)}</tbody>
            </table>
          </div>
        )}
      </Card>

      <EmployeeModal open={editing !== undefined} user={editing ?? undefined} onClose={() => setEditing(undefined)} />
    </div>
  );
}
