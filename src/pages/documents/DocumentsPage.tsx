import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, FileCheck, FileSignature, FileText, Printer, Search } from 'lucide-react';
import { ordersApi, settingsApi } from '@/api';
import type { CompanySettings, OrderDetail } from '@/types';
import { numberToWordsUz } from '@/lib/numberToWords';
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { useDebounced } from '@/components/clients/ClientPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Empty, PageHeader } from '@/components/ui/States';

type Template = 'contract' | 'invoice' | 'act' | 'offer';
const TEMPLATES: Array<{ id: Template; name: string; icon: typeof FileText; color: string }> = [
  { id: 'contract', name: 'Shartnoma', icon: FileSignature, color: 'text-blue-600 bg-blue-50' },
  { id: 'invoice', name: 'Hisob-faktura', icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'act', name: 'Dalolatnoma', icon: FileCheck, color: 'text-purple-600 bg-purple-50' },
  { id: 'offer', name: 'Tijorat taklifi', icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
];

function Requisites({ title, lines }: { title: string; lines: Array<string | null | undefined> }) {
  return (
    <div>
      <p className="mb-1 font-bold">{title}</p>
      {lines.filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
    </div>
  );
}

function ItemsTable({ order }: { order: OrderDetail }) {
  return (
    <table className="my-4 w-full border-collapse text-sm">
      <thead>
        <tr>{['№', 'Nomi', 'O\'lcham', 'Soni', 'Narxi', 'Summa'].map((h) => <th key={h} className="border border-gray-400 px-2 py-1 text-left">{h}</th>)}</tr>
      </thead>
      <tbody>
        {order.items.map((it, i) => (
          <tr key={it.id}>
            <td className="border border-gray-400 px-2 py-1">{i + 1}</td>
            <td className="border border-gray-400 px-2 py-1">{it.productType}{it.material ? ` (${it.material.name})` : ''}{it.finishing.length ? `, ${it.finishing.join(', ')}` : ''}</td>
            <td className="border border-gray-400 px-2 py-1">{it.widthCm}×{it.heightCm} sm</td>
            <td className="border border-gray-400 px-2 py-1">{it.quantity}</td>
            <td className="border border-gray-400 px-2 py-1">{formatNumber(it.unitPrice ?? 0)}</td>
            <td className="border border-gray-400 px-2 py-1">{formatNumber(it.total ?? 0)}</td>
          </tr>
        ))}
        {!!order.discount && (
          <tr><td colSpan={5} className="border border-gray-400 px-2 py-1 text-right">Chegirma</td><td className="border border-gray-400 px-2 py-1">−{formatNumber(order.discount)}</td></tr>
        )}
        <tr className="font-bold"><td colSpan={5} className="border border-gray-400 px-2 py-1 text-right">Jami</td><td className="border border-gray-400 px-2 py-1">{formatNumber(order.totalAmount ?? 0)}</td></tr>
      </tbody>
    </table>
  );
}

function Document({ t, order, co }: { t: Template; order: OrderDetail; co: CompanySettings }) {
  const total = order.totalAmount ?? 0;
  const words = `${numberToWordsUz(total)} so'm`;
  const today = formatDate(new Date().toISOString());
  const seller = [co.name, co.address, co.inn && `STIR: ${co.inn}`, co.bankName && `Bank: ${co.bankName}`, co.bankAccount && `H/r: ${co.bankAccount}`, co.mfo && `MFO: ${co.mfo}`, co.phone && `Tel: ${co.phone}`];
  const c = order.client;
  const buyer = [c.name, c.address, c.inn && `STIR: ${c.inn}`, c.bankDetails, c.phones?.[0] && `Tel: ${c.phones[0]}`];
  const titles: Record<Template, string> = {
    contract: `SHARTNOMA № ${order.number}`,
    invoice: `HISOB-FAKTURA № ${order.number}`,
    act: `BAJARILGAN ISHLAR DALOLATNOMASI № ${order.number}`,
    offer: 'TIJORAT TAKLIFI',
  };

  return (
    <div className="print-area mx-auto max-w-[800px] bg-white p-10 font-serif text-[13px] leading-relaxed text-black">
      <h2 className="text-center text-lg font-bold">{titles[t]}</h2>
      <p className="mb-6 text-center">{today}</p>

      {t === 'contract' && (
        <div className="space-y-3">
          <p>"{co.name}" (keyingi o'rinlarda "Bajaruvchi"){co.directorName ? `, direktor ${co.directorName} nomidan` : ''}, bir tomondan, va "{c.name}" (keyingi o'rinlarda "Buyurtmachi"), ikkinchi tomondan, quyidagilar haqida ushbu shartnomani tuzdilar:</p>
          <p><b>1. Shartnoma predmeti.</b> Bajaruvchi quyida ko'rsatilgan reklama mahsulotlarini tayyorlash{order.needsInstallation ? ' va o\'rnatish' : ''} majburiyatini oladi, Buyurtmachi esa ularni qabul qilib, haqini to'laydi.</p>
          <ItemsTable order={order} />
          <p><b>2. Shartnoma summasi:</b> {formatCurrency(total)} ({words}).</p>
          <p><b>3. Muddat:</b> {order.deadline ? `${formatDate(order.deadline)} gacha` : 'dizayn tasdiqlangandan keyin kelishilgan muddatda'}.</p>
          <p><b>4. To'lov tartibi:</b> {order.dueDate ? `to'lov ${formatDate(order.dueDate)} gacha amalga oshiriladi` : 'oldindan avans, qoldig\'i topshirishda'}.</p>
          <p><b>5.</b> Dizayn Buyurtmachi tomonidan tasdiqlangandan keyin ishlab chiqarishga topshiriladi. Tasdiqlangan dizayndagi xatolar uchun Bajaruvchi javobgar emas.</p>
        </div>
      )}
      {t === 'offer' && (
        <div className="space-y-3">
          <p>Hurmatli {c.contactPerson ?? c.name}! "{co.name}" sizga quyidagi taklifni yuboradi:</p>
          <ItemsTable order={order} />
          <p>Jami: <b>{formatCurrency(total)}</b> ({words}). Taklif 10 kun davomida amal qiladi.</p>
        </div>
      )}
      {(t === 'invoice' || t === 'act') && (
        <div className="space-y-3">
          {t === 'act' && <p>Biz, quyida imzo chekuvchilar, "{co.name}" (Bajaruvchi) va "{c.name}" (Buyurtmachi), quyidagi ishlar to'liq va sifatli bajarilganini tasdiqlaymiz:</p>}
          <ItemsTable order={order} />
          <p>Jami: <b>{formatCurrency(total)}</b> ({words}).</p>
          {t === 'act' && <p>Tomonlar bir-biriga e'tiroz bildirmaydi.</p>}
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-8">
        <Requisites title={t === 'offer' ? 'Kompaniya' : 'Bajaruvchi'} lines={seller} />
        {t !== 'offer' && <Requisites title="Buyurtmachi" lines={buyer} />}
      </div>
      <div className="mt-12 grid grid-cols-2 gap-8">
        <p>____________________ {co.directorName ?? ''}</p>
        {t !== 'offer' && <p>____________________</p>}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const orderId = params.get('order');
  const [template, setTemplate] = React.useState<Template>('invoice');
  const [search, setSearch] = React.useState('');
  const q = useDebounced(search);

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: settingsApi.company });
  const { data: order } = useQuery({ queryKey: ['order', orderId], queryFn: () => ordersApi.get(orderId!), enabled: !!orderId });
  const { data: found } = useQuery({ queryKey: ['orders', 'doc-search', q], queryFn: () => ordersApi.list({ search: q, limit: 8 }), enabled: q.length >= 2 });

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        <PageHeader title="Hujjatlar" subtitle="Buyurtma ma'lumotlaridan avtomatik tuziladi" />
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input className="pl-10" placeholder="Buyurtma raqami yoki mijoz..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {found && q.length >= 2 && (
            <div className="mt-2 divide-y divide-gray-50">
              {found.data.map((o) => (
                <button key={o.id} onClick={() => { setParams({ order: o.id }); setSearch(''); }} className="flex w-full justify-between px-2 py-2 text-left text-sm hover:bg-gray-50">
                  <span><b className="text-blue-600">{o.number}</b> {o.client.name}</span>
                  <span>{formatCurrency(o.totalAmount)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => setTemplate(t.id)}>
              <Card className={cn('flex items-center gap-3 p-4 transition-all', template === t.id && 'border-blue-500 ring-1 ring-blue-500')}>
                <div className={cn('rounded-xl p-2', t.color)}><t.icon className="h-5 w-5" /></div>
                <span className="font-bold text-gray-900">{t.name}</span>
              </Card>
            </button>
          ))}
        </div>
        {order && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Buyurtma: <b>{order.number}</b> — {order.client.name}</p>
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Chop etish / PDF</Button>
          </div>
        )}
      </div>
      {order && company ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm"><Document t={template} order={order} co={company} /></div>
      ) : <Card className="no-print"><Empty text="Hujjat tuzish uchun buyurtmani tanlang" /></Card>}
    </div>
  );
}
