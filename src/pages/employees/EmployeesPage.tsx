import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, CheckCircle2, Pencil, Plus, XCircle } from 'lucide-react';
import { PayrollSheetView } from '@/components/payroll/PayrollSheetView';
import { payrollApi, usersApi } from '@/api';
import type { BonusUnit, PayType, PayrollEntry, User, UserRole } from '@/types';
import { BONUS_UNIT_LABELS, ROLE_LABELS, options } from '@/lib/labels';
import { MonthInput, periodLabel, usePdfExport } from '@/components/reports/ReportToolbar';
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

// Lavozimga qarab nima sanaladi — oyna va jadvalda tushuntirish uchun
const WORK_OF: Record<UserRole, { M2: string; ORDER: string }> = {
  DESIGNER: { M2: 'tasdiqlangan dizayn m²', ORDER: 'tasdiqlangan dizayn' },
  PRINTER: { M2: 'chop etilgan m²', ORDER: 'chop etilgan buyurtma' },
  INSTALLER: { M2: 'o\'rnatilgan m²', ORDER: 'o\'rnatish' },
  MANAGER: { M2: 'yopilgan buyurtmalar m²', ORDER: 'yopilgan buyurtma (mijoz)' },
  ADMIN: { M2: 'yopilgan buyurtmalar m²', ORDER: 'yopilgan buyurtma' },
};
const unitWord = (u: BonusUnit) => (u === 'M2' ? 'm²' : 'ta');

export function bonusRuleText(u: Pick<User, 'role' | 'bonusUnit' | 'bonusThreshold' | 'bonusRate' | 'bonusRateOver'>) {
  if (u.bonusUnit === 'NONE') return null;
  const what = WORK_OF[u.role][u.bonusUnit];
  const w = unitWord(u.bonusUnit);
  if (!u.bonusThreshold || u.bonusRate === u.bonusRateOver) return `har ${what} uchun ${formatCurrency(u.bonusRateOver || u.bonusRate)}`;
  return `${u.bonusThreshold} ${w}gacha — ${formatCurrency(u.bonusRate)}, keyin — ${formatCurrency(u.bonusRateOver)} (${what})`;
}

function EmployeeModal({ user, open, onClose }: { user?: User; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const empty = { fullName: '', phone: '+998 ', role: 'INSTALLER' as UserRole, payType: 'FIXED' as PayType, salary: '', ratePerM2: '', password: '', isActive: true, bonusUnit: 'NONE' as BonusUnit, bonusThreshold: '', bonusRate: '', bonusRateOver: '' };
  const [f, setF] = React.useState(empty);

  React.useEffect(() => {
    if (!open) return;
    setF(user ? {
      fullName: user.fullName, phone: user.phone ?? '', role: user.role, payType: user.payType,
      salary: user.salary ? String(user.salary) : '', ratePerM2: user.ratePerM2 ? String(user.ratePerM2) : '', password: '', isActive: user.isActive,
      bonusUnit: user.bonusUnit ?? 'NONE', bonusThreshold: user.bonusThreshold ? String(user.bonusThreshold) : '',
      bonusRate: user.bonusRate ? String(user.bonusRate) : '', bonusRateOver: user.bonusRateOver ? String(user.bonusRateOver) : '',
    } : empty);
  }, [open, user]);

  const save = useMutation({
    mutationFn: () => {
      if ([f.salary, f.ratePerM2, f.bonusThreshold, f.bonusRate, f.bonusRateOver].some((v) => Number.isNaN(n(v)))) throw new Error('Oylik, stavka yoki bonus noto\'g\'ri kiritilgan');
      const body = {
        fullName: f.fullName.trim(), phone: f.phone, role: f.role, payType: f.payType, isActive: f.isActive,
        salary: f.payType === 'FIXED' ? n(f.salary) : null,
        ratePerM2: f.payType === 'PER_M2' ? n(f.ratePerM2) : null,
        bonusUnit: f.bonusUnit,
        bonusThreshold: f.bonusUnit === 'NONE' ? 0 : n(f.bonusThreshold),
        bonusRate: f.bonusUnit === 'NONE' ? 0 : n(f.bonusRate),
        // Chegara kiritilmasa — bitta stavka
        bonusRateOver: f.bonusUnit === 'NONE' ? 0 : (f.bonusRateOver.trim() ? n(f.bonusRateOver) : n(f.bonusRate)),
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
        <div className="col-span-2 rounded-xl border border-gray-200 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-900">Bonus (oylikka qo'shimcha, ish hajmiga qarab)</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Select label="Nima uchun" value={f.bonusUnit} onChange={(e) => setF({ ...f, bonusUnit: e.target.value as BonusUnit })} options={options(BONUS_UNIT_LABELS)} />
            </div>
            {f.bonusUnit !== 'NONE' && (
              <>
                <p className="col-span-2 -mt-2 text-xs text-gray-500">Sanaladi: {WORK_OF[f.role][f.bonusUnit]}</p>
                <Input label={`Chegara (${unitWord(f.bonusUnit)})`} inputMode="numeric" placeholder="masalan, 6" value={f.bonusThreshold} onChange={(e) => setF({ ...f, bonusThreshold: e.target.value })} />
                <Input label={`Chegaragacha, 1 ${unitWord(f.bonusUnit) === 'ta' ? 'ta' : 'm²'} uchun`} inputMode="numeric" value={f.bonusRate} onChange={(e) => setF({ ...f, bonusRate: e.target.value })} />
                <div className="col-span-2">
                  <Input label="Chegaradan keyin, har biri uchun (so'm)" inputMode="numeric" placeholder="bo'sh — yuqoridagi stavka" value={f.bonusRateOver} onChange={(e) => setF({ ...f, bonusRateOver: e.target.value })} />
                </div>
                <p className="col-span-2 text-xs text-gray-500">
                  Masalan: chegara 6, chegaragacha 0, keyin 80 000 — oyda 9 ta o'rnatish bo'lsa, 3 × 80 000 = 240 000 so'm bonus.
                </p>
              </>
            )}
          </div>
        </div>
        <div className="col-span-2"><Input label={user ? 'Yangi parol (o\'zgartirmasangiz bo\'sh qoldiring)' : 'Parol (kamida 8 belgi)'} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></div>
        {user && <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />Faol (o'chirilsa tizimga kira olmaydi)</label>}
      </div>
    </Modal>
  );
}

function PayrollRow({ e, onOpen }: { e: PayrollEntry; onOpen: () => void }) {
  const minus = e.absenceDeduction + e.latePenalty;
  const plus = e.workBonus + e.planBonus + e.onTimeBonus + e.bonus;
  return (
    <tr className="cursor-pointer border-b border-gray-50 hover:bg-gray-50/50" onClick={onOpen}>
      <td className="px-4 py-3">
        <p className="font-bold text-gray-900">{e.user.fullName}</p>
        <p className="text-xs text-gray-500">{ROLE_LABELS[e.user.role]}{e.user.payType === 'PER_M2' ? ` · ${formatNumber(e.m2Total, 2)} m²` : ''}</p>
      </td>
      <td className="px-4 py-3 font-medium">{formatCurrency(e.baseAmount)}</td>
      <td className="px-4 py-3 text-emerald-700" title="Ish hajmi + KPI + qo'shimcha bonus">{plus ? `+${formatCurrency(plus)}` : '—'}</td>
      <td className="px-4 py-3 text-red-600" title="Kelmagan kunlar + kechikish">
        {minus ? `−${formatCurrency(minus)}` : '—'}
        {(e.absentDays > 0 || e.lateCount > 0) && <p className="text-[11px] text-gray-500">{e.absentDays} kun · {e.lateCount} kechikish</p>}
      </td>
      <td className="px-4 py-3 text-red-600">{e.fine ? `−${formatCurrency(e.fine)}` : '—'}</td>
      <td className="px-4 py-3">{e.advance ? formatCurrency(e.advance) : '—'}</td>
      <td className="px-4 py-3 font-black text-gray-900">{formatCurrency(e.total)}</td>
      <td className="px-4 py-3">{e.paidAmount ? formatCurrency(e.paidAmount) : '—'}</td>
      <td className="px-4 py-3 text-right">
        {e.isPaid ? <Badge variant="success">To'langan</Badge> : <span className="font-bold text-brand-700">{formatCurrency(e.remaining)}</span>}
      </td>
    </tr>
  );
}

function SheetModal({ userId, period, onClose }: { userId: string | null; period: string; onClose: () => void }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payroll-sheet', userId, period],
    queryFn: () => payrollApi.sheet(userId!, period),
    enabled: !!userId,
  });
  return (
    <Modal open={!!userId} onClose={onClose} size="lg" title={data ? `${data.user.fullName} — ${periodLabel(period)}` : 'Oylik varag\'i'}>
      {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading || !data ? <Loading /> : <PayrollSheetView sheet={data} editable />}
    </Modal>
  );
}

export default function EmployeesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = React.useState(currentPeriod());
  const [editing, setEditing] = React.useState<User | null | undefined>(undefined);
  const [sheetUser, setSheetUser] = React.useState<string | null>(null);
  const users = useQuery({ queryKey: ['users', 'all'], queryFn: () => usersApi.list() });
  const pdf = usePdfExport(`oylik_${period}`);
  const payroll = useQuery({ queryKey: ['payroll', period], queryFn: () => payrollApi.list(period) });
  const calc = useMutation({
    mutationFn: () => payrollApi.calculate(period),
    onSuccess: () => { toast.success('Oylik hisoblandi'); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError: toast.error,
  });

  const entries = payroll.data?.entries ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Xodimlar va oylik" actions={<Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />Yangi xodim</Button>} />

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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold uppercase text-brand-600">
                          {u.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                        </div>
                        <div><p className="font-bold text-gray-900">{u.fullName}</p><p className="text-xs text-gray-500">{formatPhone(u.phone)}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge variant="outline">{ROLE_LABELS[u.role]}</Badge></td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{u.payType === 'FIXED' ? formatCurrency(u.salary) : `${formatCurrency(u.ratePerM2)} / m²`}</p>
                      {bonusRuleText(u) && <p className="text-xs text-gray-500">+ bonus: {bonusRuleText(u)}</p>}
                    </td>
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

      <div ref={pdf.ref}>
      <Card
        title={`Oylik hisobi · ${periodLabel(period)}`}
        description="Fiks (yoki m² × stavka) − kelmagan kunlar − kechikish + bonuslar − jarima. Avans qo'lga beriladigandan ushlanadi. Xodimni bosing — varag'i ochiladi"
        actions={(
          <div className="flex flex-wrap gap-2" data-pdf-hide>
            <MonthInput value={period} onChange={setPeriod} />
            <Button isLoading={calc.isPending} onClick={() => calc.mutate()}><Calculator className="h-4 w-4" />Hisoblash</Button>
            {pdf.button}
          </div>
        )}
      >
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-brand-50 p-3"><p className="text-xs text-brand-700">Qo'lga (jami)</p><p className="text-xl font-black text-brand-700">{formatCurrency(payroll.data?.total)}</p></div>
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-600">Berilgan avanslar</p><p className="text-xl font-black text-gray-900">{formatCurrency(payroll.data?.advances)}</p></div>
          <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">To'langan</p><p className="text-xl font-black text-emerald-700">{formatCurrency(payroll.data?.paid)}</p></div>
          <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-700">Berilishi kerak</p><p className="text-xl font-black text-amber-700">{formatCurrency((payroll.data?.total ?? 0) - (payroll.data?.paid ?? 0))}</p></div>
        </div>
        {payroll.isLoading ? <Loading /> : entries.length === 0 ? <Empty text={'Bu oy hali hisoblanmagan — "Hisoblash" tugmasini bosing'} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] whitespace-nowrap text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="px-4 py-2">Xodim</th><th className="px-4 py-2">Asosiy</th><th className="px-4 py-2">Bonuslar</th><th className="px-4 py-2">Davomat</th>
                  <th className="px-4 py-2">Jarima</th><th className="px-4 py-2">Avans</th><th className="px-4 py-2">Qo'lga</th><th className="px-4 py-2">To'langan</th><th className="px-4 py-2 text-right">Qoldiq</th>
                </tr>
              </thead>
              <tbody>{entries.map((e) => <PayrollRow key={e.id} e={e} onOpen={() => setSheetUser(e.userId)} />)}</tbody>
            </table>
          </div>
        )}
      </Card>
      </div>

      <SheetModal userId={sheetUser} period={period} onClose={() => setSheetUser(null)} />
      <EmployeeModal open={editing !== undefined} user={editing ?? undefined} onClose={() => setEditing(undefined)} />
    </div>
  );
}
