import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calculator, Plus, Printer, Trash2 } from 'lucide-react';
import { pricingApi, settingsApi, type OrderItemInput, type PriceInput } from '@/api';
import type { PriceListItem, PriceResult, ProductType } from '@/types';
import { errorMessage } from '@/api';
import { PRICE_UNIT_LABELS } from '@/lib/labels';
import { formatCurrency, formatNumber, parseDecimal } from '@/lib/utils';
import { areaFromMeters, formatArea, metersToCm } from '@/lib/size';
import { activeOfKind as byKind, materialCodeFor, productPriceLabel } from '@/lib/pricing';
import { useDebounced } from '@/components/clients/ClientPicker';
import { ServiceChips } from '@/components/pricing/ServiceChips';
import { OrderFormModal } from '@/components/orders/OrderFormModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorState, Loading, PageHeader } from '@/components/ui/States';

interface Row {
  /** Ro'yxatdagi tur; bo'sh — nom qo'lda, narx materialdan */
  productTypeId: string;
  productType: string;
  materialCode: string;
  printCode: string;
  // metrda: "1,20"
  width: string;
  height: string;
  quantity: string;
  finishingCodes: string[];
}

const newRow = (materialCode = '', printCode = ''): Row => ({
  productTypeId: '', productType: '', materialCode, printCode, width: '1', height: '1', quantity: '1', finishingCodes: [],
});

const label = (i: PriceListItem) => `${i.name} — ${formatCurrency(i.price)}/${PRICE_UNIT_LABELS[i.unit]}`;

export default function CalculatorPage() {
  const { data: prices, isLoading, error, refetch } = useQuery({ queryKey: ['prices'], queryFn: settingsApi.prices });
  const { data: types } = useQuery({ queryKey: ['product-types'], queryFn: settingsApi.productTypes });
  const typeOf = (r: Row): ProductType | undefined => types?.find((t) => t.id === r.productTypeId);
  // Turning o'z narxi bo'lsa material va bosma shu narx ichida
  const priced = (r: Row) => (typeOf(r)?.pricePerM2 ?? 0) > 0;
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
    const w = metersToCm(r.width), h = metersToCm(r.height), q = parseDecimal(r.quantity) ?? 0;
    if ((!priced(r) && !r.materialCode) || w === null || h === null || !(Number.isInteger(q) && q >= 1)) return null;
    return {
      productTypeId: r.productTypeId || undefined,
      ...(!priced(r) && { materialCode: r.materialCode, printCode: r.printCode || undefined }),
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
  const activeServices = new Set(finishing.map((f) => f.code));

  // Tur tanlansa: nomi, asosiy materiali va doimiy xizmatlari qo'yiladi
  const chooseType = (idx: number, id: string) => {
    const t = types?.find((x) => x.id === id);
    if (!t) return update(idx, { productTypeId: '' });
    update(idx, {
      productTypeId: t.id,
      productType: t.name,
      ...(materialCodeFor(prices, t.defaultMaterialId) && { materialCode: materialCodeFor(prices, t.defaultMaterialId) }),
      finishingCodes: t.serviceCodes.filter((c) => activeServices.has(c)),
    });
  };

  const orderItems: OrderItemInput[] = rows.flatMap((r, idx) => {
    const res = results[idx];
    if (!res || typeof res === 'string') return [];
    const mat = prices.find((p) => p.code === r.materialCode);
    return [{
      productType: r.productType.trim() || 'Mahsulot',
      materialId: priced(r) ? typeOf(r)?.defaultMaterialId ?? null : mat?.materialId ?? null,
      widthCm: metersToCm(r.width)!, heightCm: metersToCm(r.height)!, quantity: parseDecimal(r.quantity)!,
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
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Chop etish</Button>
            <Button disabled={!orderItems.length || !upToDate} onClick={() => setOrdering(true)}>Buyurtmaga aylantirish<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </>
        )}
      />

      {materials.length === 0 && !types?.some((t) => t.isActive && t.pricePerM2 > 0) && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Narx yo'q: Mahsulot turlari sahifasida turga narx qo'ying yoki Sozlamalar → Narxlar'da material qo'shing.</Card>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Mahsulotlar">
            <div className="space-y-4">
              {rows.map((r, idx) => {
                const res = results[idx];
                const t = typeOf(r);
                return (
                  <div key={idx} className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Mahsulot #{idx + 1}</h4>
                      {rows.length > 1 && <button onClick={() => setRows((l) => l.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700" aria-label="O'chirish"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      <Select
                        label="Mahsulot turi"
                        value={r.productTypeId}
                        onChange={(e) => chooseType(idx, e.target.value)}
                        placeholder="Boshqa (ro'yxatda yo'q)"
                        options={(types ?? []).filter((x) => x.isActive).map((x) => ({ value: x.id, label: productPriceLabel(x) ? `${x.name} — ${productPriceLabel(x)}` : x.name }))}
                      />
                      {!r.productTypeId && <Input label="Nomi" value={r.productType} onChange={(e) => update(idx, { productType: e.target.value })} placeholder="Masalan: Vyveska" />}
                      {t && priced(r) ? (
                        <p className="col-span-2 self-end rounded-lg bg-brand-50 px-3 py-2 text-xs text-gray-700 md:col-span-2">
                          Narx turdan: <b>{productPriceLabel(t)}</b> — material va bosma shu narx ichida
                        </p>
                      ) : (
                        <>
                          <Select label="Material" value={r.materialCode} onChange={(e) => update(idx, { materialCode: e.target.value })} options={materials.map((m) => ({ value: m.code, label: label(m) }))} />
                          <Select label="Bosma" value={r.printCode} onChange={(e) => update(idx, { printCode: e.target.value })} placeholder="Bosmasiz" options={byKind(prices, 'PRINT').map((m) => ({ value: m.code, label: label(m) }))} />
                        </>
                      )}
                      <Input label="Eni, m" inputMode="decimal" placeholder="1,40" value={r.width} onChange={(e) => update(idx, { width: e.target.value })} />
                      <Input label="Bo'yi, m" inputMode="decimal" placeholder="1,20" value={r.height} onChange={(e) => update(idx, { height: e.target.value })} />
                      <Input label="Soni" inputMode="numeric" value={r.quantity} onChange={(e) => update(idx, { quantity: e.target.value })} />
                    </div>
                    <ServiceChips services={finishing} value={r.finishingCodes} onChange={(finishingCodes) => update(idx, { finishingCodes })} showPrice />
                    {areaFromMeters(r.width, r.height) > 0 && (
                      <p className="text-sm text-gray-600">
                        {r.width} × {r.height} = <b className="text-gray-900">{formatArea(areaFromMeters(r.width, r.height))}</b>
                        {(parseDecimal(r.quantity) ?? 0) > 1 && <> · {r.quantity} dona = {formatArea(areaFromMeters(r.width, r.height) * (parseDecimal(r.quantity) ?? 0))}</>}
                      </p>
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
                <Plus className="h-4 w-4" />Yana qo'shish
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
          <Card className="sticky top-24 overflow-hidden border-0 bg-gray-900 p-6 text-white">
            <div className="mb-6 flex items-center space-x-2">
              <Calculator className="h-5 w-5 opacity-80" />
              <h3 className="text-sm font-bold uppercase tracking-wider opacity-90">Hisob-kitob</h3>
            </div>
            <div className="space-y-3 text-sm">
              {sum('productCost') > 0 && <div className="flex justify-between"><span className="opacity-70">Mahsulot (tur narxi):</span><span>{formatCurrency(sum('productCost'))}</span></div>}
              <div className="flex justify-between"><span className="opacity-70">Material:</span><span>{formatCurrency(sum('materialCost'))}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Bosma:</span><span>{formatCurrency(sum('printCost'))}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Xizmatlar:</span><span>{formatCurrency(sum('finishingCost'))}</span></div>
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
