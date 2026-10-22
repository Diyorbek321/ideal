import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ClipboardCheck, Package, Plus, Search } from 'lucide-react';
import { inventoryApi } from '@/api';
import type { Material, MaterialUnit } from '@/types';
import { UNIT_LABELS, options } from '@/lib/labels';
import { isFinance, useUser } from '@/lib/auth';
import { cn, formatCurrency, formatDateTime, formatNumber, parseDecimal, parseMoney } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Tabs } from '@/components/reports/Tabs';
import { InventoryAnalytics } from './InventoryAnalytics';

type Op = { kind: 'in' | 'out'; material?: Material } | { kind: 'new' } | { kind: 'count' } | { kind: 'history'; material: Material };
const dec = (s: string) => parseDecimal(s) ?? NaN;
const money = (s: string) => parseMoney(s) ?? NaN;

function OpModal({ op, materials, onClose }: { op: Op | null; materials: Material[]; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [materialId, setMaterialId] = React.useState('');
  const [qty, setQty] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [supplier, setSupplier] = React.useState('');
  const [note, setNote] = React.useState('');
  const [mat, setMat] = React.useState({ name: '', category: '', unit: 'M2' as MaterialUnit, minStock: '', purchasePrice: '' });
  const [counts, setCounts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!op) return;
    setMaterialId('material' in op && op.material ? op.material.id : materials[0]?.id ?? '');
    setQty(''); setPrice(''); setSupplier(''); setNote(''); setCounts({});
    setMat({ name: '', category: '', unit: 'M2', minStock: '', purchasePrice: '' });
  }, [op, materials]);

  const { data: history } = useQuery({
    queryKey: ['movements', op?.kind === 'history' ? op.material.id : null],
    queryFn: () => inventoryApi.movements({ materialId: (op as { material: Material }).material.id, limit: 50 }),
    enabled: op?.kind === 'history',
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!op) return;
      // Noto'g'ri raqam serverga yuborilmaydi
      const bad = (v: number) => Number.isNaN(v);
      if ((op.kind === 'in' || op.kind === 'out') && (bad(dec(qty)) || (price && bad(money(price))))) throw new Error('Miqdor yoki narx noto\'g\'ri kiritilgan');
      if (op.kind === 'new' && ((mat.minStock && bad(dec(mat.minStock))) || (mat.purchasePrice && bad(money(mat.purchasePrice))))) throw new Error('Raqamlar noto\'g\'ri kiritilgan');
      if (op.kind === 'in') return inventoryApi.stockIn({ materialId, quantity: dec(qty), price: price ? money(price) : undefined, supplier: supplier || undefined, note: note || undefined });
      if (op.kind === 'out') return inventoryApi.stockOut({ materialId, quantity: dec(qty), note: note || undefined });
      if (op.kind === 'new') return inventoryApi.createMaterial({ name: mat.name, category: mat.category, unit: mat.unit, minStock: mat.minStock ? dec(mat.minStock) : 0, purchasePrice: mat.purchasePrice ? money(mat.purchasePrice) : 0 });
      if (op.kind === 'count') {
        const items = Object.entries(counts).filter(([, v]) => v !== '').map(([id, v]) => ({ materialId: id, actual: dec(v) }));
        if (items.some((i) => Number.isNaN(i.actual))) throw new Error('Qoldiq noto\'g\'ri kiritilgan');
        return inventoryApi.count(items, note || undefined);
      }
    },
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['materials'] }); qc.invalidateQueries({ queryKey: ['movements'] }); onClose(); },
    onError: toast.error,
  });

  if (!op) return null;
  const titles = { in: 'Kirim qilish', out: 'Chiqim qilish', new: 'Yangi material', count: 'Inventarizatsiya', history: 'Harakatlar tarixi' };
  const unit = materials.find((m) => m.id === materialId)?.unit;

  return (
    <Modal
      open
      onClose={onClose}
      title={op.kind === 'history' ? `${op.material.name}: tarix` : titles[op.kind]}
      size={op.kind === 'count' || op.kind === 'history' ? 'lg' : 'md'}
      footer={op.kind === 'history' ? undefined : (
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </>
      )}
    >
      {(op.kind === 'in' || op.kind === 'out') && (
        <div className="space-y-4">
          <Select label="Material" value={materialId} onChange={(e) => setMaterialId(e.target.value)} options={materials.map((m) => ({ value: m.id, label: `${m.name} (${formatNumber(m.stock, 1)} ${UNIT_LABELS[m.unit]})` }))} />
          <Input label={`Miqdor${unit ? `, ${UNIT_LABELS[unit]}` : ''}`} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          {op.kind === 'in' && <Input label="Birlik narxi (so'm)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />}
          {op.kind === 'in' && <Input label="Yetkazib beruvchi" value={supplier} onChange={(e) => setSupplier(e.target.value)} />}
          <Input label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
      {op.kind === 'new' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Nomi" value={mat.name} onChange={(e) => setMat({ ...mat, name: e.target.value })} autoFocus /></div>
          <Input label="Kategoriya" value={mat.category} onChange={(e) => setMat({ ...mat, category: e.target.value })} placeholder="Banner, Akril..." />
          <Select label="O'lchov birligi" value={mat.unit} onChange={(e) => setMat({ ...mat, unit: e.target.value as MaterialUnit })} options={options(UNIT_LABELS)} />
          <Input label="Minimal qoldiq" inputMode="decimal" value={mat.minStock} onChange={(e) => setMat({ ...mat, minStock: e.target.value })} />
          <Input label="Xarid narxi" inputMode="numeric" value={mat.purchasePrice} onChange={(e) => setMat({ ...mat, purchasePrice: e.target.value })} />
        </div>
      )}
      {op.kind === 'count' && (
        <div className="space-y-2">
          <p className="mb-2 text-sm text-gray-500">Haqiqiy qoldiqni kiriting. Bo'sh qoldirilganlar o'zgarmaydi; farq tarixga yoziladi.</p>
          {materials.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm">{m.name}</span>
              <span className="w-24 text-right text-xs text-gray-400">tizimda {formatNumber(m.stock, 1)}</span>
              <input
                inputMode="decimal"
                value={counts[m.id] ?? ''}
                onChange={(e) => setCounts((c) => ({ ...c, [m.id]: e.target.value }))}
                className="h-9 w-28 rounded-md border border-gray-300 px-2 text-sm"
                aria-label={`${m.name} haqiqiy qoldiq`}
              />
            </div>
          ))}
        </div>
      )}
      {op.kind === 'history' && (
        !history ? <Loading /> : history.data.length === 0 ? <Empty text="Harakat yo'q" /> : (
          <table className="w-full text-left text-sm">
            <tbody>
              {history.data.map((h) => (
                <tr key={h.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-500">{formatDateTime(h.createdAt)}</td>
                  <td className={cn('py-2 font-bold', h.type === 'IN' ? 'text-emerald-600' : h.type === 'OUT' ? 'text-red-600' : 'text-amber-600')}>
                    {h.type === 'IN' ? '+' : h.type === 'OUT' ? '−' : '±'}{h.quantity}
                  </td>
                  <td className="py-2 text-gray-600">{h.order?.number ?? h.supplier ?? h.note ?? ''}</td>
                  <td className="py-2 text-gray-400">{h.user.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </Modal>
  );
}

export default function InventoryPage() {
  const [tab, setTab] = React.useState<'stock' | 'analytics'>('stock');
  const tabs = <Tabs value={tab} onChange={setTab} items={[{ value: 'stock', label: 'Qoldiqlar' }, { value: 'analytics', label: 'Oylik tahlil' }]} />;
  return tab === 'analytics' ? <InventoryAnalytics tabs={tabs} /> : <StockView tabs={tabs} />;
}

function StockView({ tabs }: { tabs: React.ReactNode }) {
  const user = useUser();
  const finance = isFinance(user.role);
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [op, setOp] = React.useState<Op | null>(null);
  const { data: materials, isLoading, error, refetch } = useQuery({ queryKey: ['materials'], queryFn: () => inventoryApi.materials() });

  const list = (materials ?? []).filter((m) =>
    (!category || m.category === category) && (!search || m.name.toLowerCase().includes(search.toLowerCase())));
  const categories = [...new Set((materials ?? []).map((m) => m.category))];
  const lowCount = (materials ?? []).filter((m) => m.isLow).length;
  const stockValue = (materials ?? []).reduce((s, m) => s + Math.max(0, m.stock) * (m.purchasePrice ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ombor va materiallar"
        subtitle="Qoldiq ishlab chiqarishda avtomatik kamayadi"
        actions={(
          <>
            {tabs}
            <Button variant="outline" onClick={() => setOp({ kind: 'in' })}><ArrowDownLeft className="h-4 w-4" />Kirim</Button>
            <Button variant="outline" onClick={() => setOp({ kind: 'out' })}><ArrowUpRight className="h-4 w-4" />Chiqim</Button>
            {finance && <Button variant="outline" onClick={() => setOp({ kind: 'count' })}><ClipboardCheck className="h-4 w-4" />Inventarizatsiya</Button>}
            {finance && <Button onClick={() => setOp({ kind: 'new' })}><Plus className="h-4 w-4" />Yangi material</Button>}
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex items-center space-x-4 p-4">
          <div className="rounded-full bg-brand-50 p-3 text-brand-600"><Package className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-gray-500">Jami turlar</p><p className="text-2xl font-bold text-gray-900">{materials?.length ?? 0}</p></div>
        </Card>
        <Card className="flex items-center space-x-4 border-red-100 p-4">
          <div className="rounded-full bg-red-50 p-3 text-red-600"><AlertTriangle className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-gray-500">Kam qolganlar</p><p className="text-2xl font-bold text-red-600">{lowCount}</p></div>
        </Card>
        {finance && (
          <Card className="flex items-center space-x-4 p-4">
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-600"><ArrowUpRight className="h-6 w-6" /></div>
            <div><p className="text-sm font-medium text-gray-500">Ombordagi qiymat</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(stockValue)}</p></div>
          </Card>
        )}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Material nomi..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory((x) => (x === c ? '' : c))}>
                <Badge variant={category === c ? 'info' : 'outline'} className="cursor-pointer">{c}</Badge>
              </button>
            ))}
          </div>
        </div>
        {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Loading /> : list.length === 0 ? <Empty text="Material topilmadi" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 font-semibold text-gray-900">Material</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Kategoriya</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Qoldiq</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Minimal</th>
                  {finance && <th className="px-6 py-4 font-semibold text-gray-900">Xarid narxi</th>}
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{m.name}</td>
                    <td className="px-6 py-4 text-gray-500">{m.category}</td>
                    <td className="px-6 py-4">
                      <span className={cn('font-bold', m.isLow ? 'text-red-600' : 'text-gray-900')}>{formatNumber(m.stock, 1)} {UNIT_LABELS[m.unit]}</span>
                      {m.isLow && <Badge variant="error" className="ml-2">KAM</Badge>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{m.minStock}</td>
                    {finance && <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(m.purchasePrice)}</td>}
                    <td className="space-x-3 px-6 py-4 text-right">
                      <button className="font-bold text-emerald-600 hover:underline" onClick={() => setOp({ kind: 'in', material: m })}>Kirim</button>
                      {finance && <button className="font-bold text-brand-600 hover:underline" onClick={() => setOp({ kind: 'history', material: m })}>Tarix</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <OpModal op={op} materials={materials ?? []} onClose={() => setOp(null)} />
    </div>
  );
}
