import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calculator, Plus, Printer, Trash2 } from 'lucide-react';
import { pricingApi, settingsApi, type OrderItemInput, type PriceInput } from '@/api';
import type { PriceListItem, PriceResult } from '@/types';
import { errorMessage } from '@/api';
import { PRICE_UNIT_LABELS } from '@/lib/labels';
import { formatCurrency, formatNumber, parseDecimal } from '@/lib/utils';
import { useDebounced } from '@/components/clients/ClientPicker';
import { OrderFormModal } from '@/components/orders/OrderFormModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorState, Loading, PageHeader } from '@/components/ui/States';

interface Row {
  productType: string;
  materialCode: string;
  printCode: string;
  widthCm: string;
  heightCm: string;
  quantity: string;
  finishingCodes: string[];
}

const newRow = (materialCode = '', printCode = ''): Row => ({
  productType: 'Banner', materialCode, printCode, widthCm: '100', heightCm: '100', quantity: '1', finishingCodes: [],
});

const byKind = (items: PriceListItem[], kind: PriceListItem['kind']) => items.filter((i) => i.kind === kind && i.isActive);
const label = (i: PriceListItem) => `${i.name} — ${formatCurrency(i.price)}/${PRICE_UNIT_LABELS[i.unit]}`;

export default function CalculatorPage() {
  const { data: prices, isLoading, error, refetch } = useQuery({ queryKey: ['prices'], queryFn: settingsApi.prices });
  const [rows, setRows] = React.useState<Row[]>([]);
  const [needsDesign, setNeedsDesign] = React.useState(false);
  const [installationCode, setInstallationCode] = React.useState('');
  const [urgent, setUrgent] = React.useState(false);
  const [results, setResults] = React.useState<Array<PriceResult | string | null>>([]);
  const [resultsKey, setResultsKey] = React.useState('');
  const [ordering, setOrdering] = React.useState(false);

  React.useEffect(() => {
    if (prices && rows.length === 0) setRows([newRow(byKind(prices, 'MATERIAL')[0]?.code, byKind(prices, 'PRINT')[0]?.code)]);
  }, [prices, rows.length]);

  const inputs: Array<PriceInput | null> = rows.map((r, idx) => {
    const w = parseDecimal(r.widthCm) ?? 0, h = parseDecimal(r.heightCm) ?? 0, q = parseDecimal(r.quantity) ?? 0;
    if (!r.materialCode || !(w > 0 && h > 0 && Number.isInteger(q) && q >= 1)) return null;
    return {
      materialCode: r.materialCode,
      printCode: r.printCode || undefined,
      widthCm: w, heightCm: h, quantity: Math.round(q),
      finishingCodes: r.finishingCodes,
      needsDesign,
      // O'rnatish buyurtma uchun bir marta — birinchi mahsulotga qo'shiladi
      installationCode: idx === 0 && installationCode ? installationCode : undefined,
      urgent,
    };
  });
  const debounced = useDebounced(JSON.stringify(inputs), 350);

  React.useEffect(() => {
    let cancelled = false;
    const list = JSON.parse(debounced) as Array<PriceInput | null>;
    Promise.all(list.map((inp) => (inp ? pricingApi.calculate(inp).catch((e: unknown) => errorMessage(e)) : Promise.resolve(null))))
      .then((r) => { if (!cancelled) { setResults(r); setResultsKey(debounced); } });
    return () => { cancelled = true; };
  }, [debounced]);

  if (isLoading) return <Loading rows={6} />;
  if (error || !prices) return <ErrorState error={error} onRetry={refetch} />;

  const upToDate = resultsKey === JSON.stringify(inputs);
  const ok = results.filter((r): r is PriceResult => !!r && typeof r !== 'string');
  const sum = (k: keyof PriceResult) => ok.reduce((s, r) => s + (r[k] as number), 0);
  const total = sum('total');
  const cost = sum('costTotal');
  const materials = byKind(prices, 'MATERIAL');
  const finishing = byKind(prices, 'FINISHING');

  const update = (idx: number, patch: Partial<Row>) => setRows((l) => l.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const orderItems: OrderItemInput[] = rows.flatMap((r, idx) => {
    const res = results[idx];
    if (!res || typeof res === 'string') return [];
    const mat = prices.find((p) => p.code === r.materialCode);
    return [{
      productType: r.productType || 'Mahsulot',
      materialId: mat?.materialId ?? null,
      widthCm: parseDecimal(r.widthCm)!, heightCm: parseDecimal(r.heightCm)!, quantity: parseDecimal(r.quantity)!,
      finishing: r.finishingCodes.map((c) => prices.find((p) => p.code === c)?.name ?? c),
      unitPrice: res.unitPrice,
    }];
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Narx kalkulyatori"
        subtitle="Narxlar sozlamalardagi narxlar ro'yxatidan olinadi"
        actions={(
          <>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Chop etish</Button>
            <Button disabled={!orderItems.length || !upToDate} onClick={() => setOrdering(true)}>Buyurtmaga aylantirish<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </>
        )}
      />

      {materials.length === 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Narxlar ro'yxatida material yo'q. Sozlamalar → Narxlar bo'limida qo'shing.</Card>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Mahsulotlar">
            <div className="space-y-4">
              {rows.map((r, idx) => {
                const res = results[idx];
                return (
                  <div key={idx} className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Mahsulot #{idx + 1}</h4>
                      {rows.length > 1 && <button onClick={() => setRows((l) => l.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700" aria-label="O'chirish"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      <Input label="Nomi" value={r.productType} onChange={(e) => update(idx, { productType: e.target.value })} />
                      <Select label="Material" value={r.materialCode} onChange={(e) => update(idx, { materialCode: e.target.value })} options={materials.map((m) => ({ value: m.code, label: label(m) }))} />
                      <Select label="Bosma" value={r.printCode} onChange={(e) => update(idx, { printCode: e.target.value })} placeholder="Bosmasiz" options={byKind(prices, 'PRINT').map((m) => ({ value: m.code, label: label(m) }))} />
                      <Input label="Eni, sm" inputMode="decimal" value={r.widthCm} onChange={(e) => update(idx, { widthCm: e.target.value })} />
                      <Input label="Bo'yi, sm" inputMode="decimal" value={r.heightCm} onChange={(e) => update(idx, { heightCm: e.target.value })} />
                      <Input label="Soni" inputMode="numeric" value={r.quantity} onChange={(e) => update(idx, { quantity: e.target.value })} />
                    </div>
                    {finishing.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {finishing.map((f) => {
                          const on = r.finishingCodes.includes(f.code);
                          return (
                            <button
                              key={f.code}
                              type="button"
                              onClick={() => update(idx, { finishingCodes: on ? r.finishingCodes.filter((c) => c !== f.code) : [...r.finishingCodes, f.code] })}
                              className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                            >
                              {f.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {typeof res === 'string' && <p className="text-xs text-red-600">{res}</p>}
                    {res && typeof res !== 'string' && (
                      <div className="flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-3 text-sm">
                        <span className="text-gray-500">{res.areaM2PerUnit} m² × {r.quantity} = {res.totalAreaM2} m²</span>
                        <span className="font-bold text-gray-900">{formatCurrency(res.total)} <span className="font-normal text-gray-500">(dona: {formatCurrency(res.unitPrice)})</span></span>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button variant="outline" className="w-full border-dashed" onClick={() => setRows((l) => [...l, newRow(materials[0]?.code, byKind(prices, 'PRINT')[0]?.code)])}>
                <Plus className="mr-2 h-4 w-4" />Yana qo'shish
              </Button>
            </div>
          </Card>

          <Card title="Qo'shimcha xizmatlar">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={needsDesign} onChange={(e) => setNeedsDesign(e.target.checked)} />Dizayn kerak</label>
              <Select label="O'rnatish" value={installationCode} onChange={(e) => setInstallationCode(e.target.value)} placeholder="O'rnatishsiz" options={byKind(prices, 'INSTALLATION').map((m) => ({ value: m.code, label: label(m) }))} />
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />Shoshilinch</label>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 overflow-hidden border-0 bg-blue-600 p-6 text-white shadow-xl">
            <div className="mb-6 flex items-center space-x-2">
              <Calculator className="h-5 w-5 opacity-80" />
              <h3 className="text-sm font-bold uppercase tracking-wider opacity-90">Hisob-kitob</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="opacity-70">Material:</span><span>{formatCurrency(sum('materialCost'))}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Bosma:</span><span>{formatCurrency(sum('printCost'))}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Pardozlash:</span><span>{formatCurrency(sum('finishingCost'))}</span></div>
              {needsDesign && <div className="flex justify-between"><span className="opacity-70">Dizayn:</span><span>{formatCurrency(sum('designCost'))}</span></div>}
              {installationCode && <div className="flex justify-between"><span className="opacity-70">O'rnatish:</span><span>{formatCurrency(sum('installationCost'))}</span></div>}
              {urgent && <div className="flex justify-between"><span className="opacity-70">Shoshilinchlik:</span><span>+{formatCurrency(sum('urgencyExtra'))}</span></div>}
              <div className="mt-4 border-t border-white/20 pt-4">
                <div className="flex items-end justify-between"><span className="text-lg font-bold">JAMI:</span><span className="text-3xl font-black">{formatCurrency(total)}</span></div>
                <p className="mt-1 text-right text-xs opacity-70">{formatNumber(sum('totalAreaM2'), 2)} m²</p>
              </div>
            </div>
          </Card>

          <Card title="Tannarx va foyda">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Tannarx:</span><span className="font-medium">{formatCurrency(cost)}</span></div>
              <div className="flex justify-between font-bold"><span>Marja:</span><span className="text-emerald-600">{formatCurrency(total - cost)} ({total ? Math.round(((total - cost) / total) * 100) : 0}%)</span></div>
              {sum('suggestedPrice') > total && (
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Tavsiya etilgan minimal narx: {formatCurrency(sum('suggestedPrice'))}</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {ordering && <OrderFormModal open onClose={() => setOrdering(false)} initialItems={orderItems} initialNeedsDesign={needsDesign} initialNeedsInstallation={!!installationCode} />}
    </div>
  );
}
