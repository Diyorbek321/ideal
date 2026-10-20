import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, DollarSign, MessageSquare, Plus, Timer } from 'lucide-react';
import { settingsApi } from '@/api';
import type { CompanySettings, OrderStatus, PriceKind, PriceListItem, PriceUnit } from '@/types';
import { PRICE_KIND_LABELS, PRICE_UNIT_LABELS, STATUS_LABELS, options } from '@/lib/labels';
import { cn, formatCurrency, parseDecimal, parseMoney } from '@/lib/utils';
import { SmsSettings } from '@/components/settings/SmsSettings';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const SLA_STATUSES: OrderStatus[] = ['YANGI', 'NARX_HISOBLANDI', 'DIZAYNDA', 'TASDIQDA', 'ISHLAB_CHIQARISHDA', 'TAYYOR', 'ORNATISHDA', 'YETKAZISHDA'];
type Tab = 'company' | 'prices' | 'sla' | 'sms';

function CompanyTab({ s }: { s: CompanySettings }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = React.useState(s);
  React.useEffect(() => setF(s), [s]);
  const save = useMutation({
    mutationFn: () => settingsApi.updateCompany({
      name: f.name, inn: f.inn || null, address: f.address || null, phone: f.phone || null, bankName: f.bankName || null,
      bankAccount: f.bankAccount || null, mfo: f.mfo || null, directorName: f.directorName || null,
    }),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['company'] }); },
    onError: toast.error,
  });
  const set = (k: keyof CompanySettings) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Card title="Kompaniya ma'lumotlari" description="Shartnoma, hisob-faktura va mijoz sahifasida ko'rinadi">
      <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input label="Kompaniya nomi" value={f.name} onChange={set('name')} />
        <Input label="STIR (INN)" value={f.inn ?? ''} onChange={set('inn')} />
        <Input label="Bank nomi" value={f.bankName ?? ''} onChange={set('bankName')} />
        <Input label="MFO" value={f.mfo ?? ''} onChange={set('mfo')} />
        <Input label="Hisob raqami" value={f.bankAccount ?? ''} onChange={set('bankAccount')} />
        <Input label="Telefon" value={f.phone ?? ''} onChange={set('phone')} />
        <Input label="Direktor F.I.Sh." value={f.directorName ?? ''} onChange={set('directorName')} />
        <Input label="Manzil" value={f.address ?? ''} onChange={set('address')} />
      </div>
      <div className="mt-8 flex justify-end"><Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></div>
    </Card>
  );
}

function SlaTab({ s }: { s: CompanySettings }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [sla, setSla] = React.useState<Record<string, string>>({});
  const [params, setParams] = React.useState({ urgency: '', margin: '', capacity: '' });
  React.useEffect(() => {
    setSla(Object.fromEntries(SLA_STATUSES.map((st) => [st, String(s.slaHours[st] ?? '')])));
    setParams({ urgency: String(s.urgencyMultiplier), margin: String(s.defaultMarginPercent), capacity: String(s.installationCapacity) });
  }, [s]);
  const save = useMutation({
    mutationFn: () => settingsApi.updateCompany({
      slaHours: Object.fromEntries(Object.entries(sla).filter(([, v]) => (parseDecimal(v) ?? 0) > 0).map(([k, v]) => [k, parseDecimal(v)!])),
      urgencyMultiplier: parseDecimal(params.urgency) ?? s.urgencyMultiplier,
      defaultMarginPercent: parseDecimal(params.margin) ?? s.defaultMarginPercent,
      installationCapacity: parseDecimal(params.capacity) ?? s.installationCapacity,
    }),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['company'] }); },
    onError: toast.error,
  });

  return (
    <div className="space-y-6">
      <Card title="SLA — bosqichdagi maksimal vaqt (soat)" description="Oshib ketsa buyurtma qizil bilan belgilanadi va bosh sahifada chiqadi">
        <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
          {SLA_STATUSES.map((st) => (
            <Input key={st} label={STATUS_LABELS[st]} inputMode="numeric" value={sla[st] ?? ''} onChange={(e) => setSla({ ...sla, [st]: e.target.value })} />
          ))}
        </div>
      </Card>
      <Card title="Hisob-kitob parametrlari">
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Shoshilinchlik koeffitsiyenti" inputMode="decimal" value={params.urgency} onChange={(e) => setParams({ ...params, urgency: e.target.value })} />
          <Input label="Minimal marja, %" inputMode="decimal" value={params.margin} onChange={(e) => setParams({ ...params, margin: e.target.value })} />
          <Input label="Kunlik o'rnatish sig'imi" inputMode="numeric" value={params.capacity} onChange={(e) => setParams({ ...params, capacity: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end"><Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></div>
      </Card>
    </div>
  );
}

function PriceRow({ p }: { p: PriceListItem }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [price, setPrice] = React.useState(String(p.price));
  const [cost, setCost] = React.useState(String(p.costPrice));
  const save = useMutation({
    mutationFn: (body: Partial<PriceListItem>) => settingsApi.updatePrice(p.id, body),
    onSuccess: () => { toast.success('Narx yangilandi'); qc.invalidateQueries({ queryKey: ['prices'] }); },
    onError: toast.error,
  });
  const priceN = parseMoney(price);
  const costN = parseMoney(cost);
  const dirty = priceN !== p.price || costN !== p.costPrice;
  return (
    <tr className={cn('border-b border-gray-50', !p.isActive && 'opacity-40')}>
      <td className="py-2 pr-2"><p className="font-medium">{p.name}</p><p className="text-[11px] text-gray-400">{p.code}</p></td>
      <td className="py-2 pr-2 text-gray-500">{PRICE_KIND_LABELS[p.kind]}</td>
      <td className="py-2 pr-2 text-gray-500">{PRICE_UNIT_LABELS[p.unit]}</td>
      <td className="py-2 pr-2"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className="h-8 w-28 rounded border border-gray-200 px-2" aria-label="Narx" /></td>
      <td className="py-2 pr-2"><input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" className="h-8 w-28 rounded border border-gray-200 px-2" aria-label="Tannarx" /></td>
      <td className="whitespace-nowrap py-2 text-right">
        {dirty && <Button size="sm" disabled={priceN === null || costN === null} isLoading={save.isPending} onClick={() => save.mutate({ price: priceN!, costPrice: costN! })}>Saqlash</Button>}
        <Button size="sm" variant="ghost" onClick={() => save.mutate({ isActive: !p.isActive })}>{p.isActive ? 'O\'chirish' : 'Yoqish'}</Button>
      </td>
    </tr>
  );
}

function PricesTab() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: prices, isLoading } = useQuery({ queryKey: ['prices'], queryFn: settingsApi.prices });
  const { data: types } = useQuery({ queryKey: ['product-types'], queryFn: settingsApi.productTypes });
  const [f, setF] = React.useState({ code: '', name: '', kind: 'MATERIAL' as PriceKind, unit: 'M2' as PriceUnit, price: '', costPrice: '' });
  const [typeName, setTypeName] = React.useState('');

  const create = useMutation({
    mutationFn: () => {
      const price = parseMoney(f.price);
      const costPrice = f.costPrice.trim() ? parseMoney(f.costPrice) : 0;
      if (price === null || costPrice === null) return Promise.reject(new Error('Narxni raqam bilan kiriting'));
      return settingsApi.createPrice({ code: f.code.toUpperCase(), name: f.name, kind: f.kind, unit: f.unit, price, costPrice });
    },
    onSuccess: () => { toast.success('Qo\'shildi'); setF({ ...f, code: '', name: '', price: '', costPrice: '' }); qc.invalidateQueries({ queryKey: ['prices'] }); },
    onError: toast.error,
  });
  const addType = useMutation({
    mutationFn: () => settingsApi.createProductType(typeName.trim()),
    onSuccess: () => { setTypeName(''); qc.invalidateQueries({ queryKey: ['product-types'] }); },
    onError: toast.error,
  });

  return (
    <div className="space-y-6">
      <Card title="Narxlar ro'yxati" description="Kalkulyator shu narxlardan hisoblaydi. Narx — sotuv, tannarx — marja hisobi uchun">
        {isLoading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-gray-100 text-gray-500"><th className="py-2">Nomi</th><th>Turi</th><th>Birlik</th><th>Narx</th><th>Tannarx</th><th /></tr></thead>
              <tbody>{prices?.map((p) => <PriceRow key={`${p.id}-${p.price}-${p.costPrice}-${p.isActive}`} p={p} />)}</tbody>
            </table>
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-dashed border-gray-200 p-4 md:grid-cols-7">
          <Input label="Kod" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="AKRIL_5" />
          <div className="col-span-2"><Input label="Nomi" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <Select label="Turi" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PriceKind })} options={options(PRICE_KIND_LABELS)} />
          <Select label="Birlik" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as PriceUnit })} options={options(PRICE_UNIT_LABELS)} />
          <Input label="Narx" inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <div className="flex items-end gap-2">
            <Input label="Tannarx" inputMode="numeric" value={f.costPrice} onChange={(e) => setF({ ...f, costPrice: e.target.value })} />
            <Button disabled={!f.code || !f.name || !f.price} isLoading={create.isPending} onClick={() => create.mutate()} aria-label="Qo'shish"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Dizayn narxi kodi albatta <b>DESIGN_M2</b> bo'lishi kerak. Hozir: {formatCurrency(prices?.find((p) => p.code === 'DESIGN_M2')?.price)} / m².</p>
      </Card>

      <Card title="Mahsulot turlari" description="Buyurtma formasida tanlash uchun">
        <div className="mb-4 flex flex-wrap gap-2">
          {types?.map((t) => <span key={t.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm">{t.name}</span>)}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typeName.trim()) addType.mutate(); }}>
          <Input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="Yangi tur" />
          <Button type="submit" isLoading={addType.isPending}>Qo'shish</Button>
        </form>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = React.useState<Tab>('company');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['company'], queryFn: settingsApi.company });
  const tabs: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
    { id: 'company', label: 'Kompaniya', icon: Building2 },
    { id: 'prices', label: 'Narxlar', icon: DollarSign },
    { id: 'sla', label: 'SLA va parametrlar', icon: Timer },
    { id: 'sms', label: 'SMS xizmati', icon: MessageSquare },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader title="Sozlamalar" subtitle="Kompaniya ma'lumotlari va tizim parametrlari" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn('flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-left text-sm', tab === t.id ? 'bg-blue-50 font-bold text-blue-600' : 'font-medium text-gray-600 hover:bg-gray-50')}
            >
              <t.icon className="h-4 w-4" /><span>{t.label}</span>
            </button>
          ))}
        </div>
        <div className="md:col-span-3">
          {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading || !data ? <Loading /> : (
            tab === 'company' ? <CompanyTab s={data} /> : tab === 'sla' ? <SlaTab s={data} /> : tab === 'sms' ? <SmsSettings /> : <PricesTab />
          )}
        </div>
      </div>
    </div>
  );
}
