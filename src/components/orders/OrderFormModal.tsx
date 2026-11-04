import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { inventoryApi, ordersApi, settingsApi, usersApi, type OrderInput, type OrderItemInput } from '@/api';
import type { Client, OrderDetail, OrderSource, PriceLine, PriceListItem } from '@/types';
import { PRICE_UNIT_LABELS, SOURCE_LABELS, options } from '@/lib/labels';
import { toDateInput, formatCurrency, formatNumber, parseDecimal, parseMoney } from '@/lib/utils';
import { areaFromMeters, cmToMeters, formatArea, metersToCm } from '@/lib/size';
import { activeOfKind, findType, productPriceLabel } from '@/lib/pricing';
import { ServiceChips } from '@/components/pricing/ServiceChips';
import { installationIndex, priceInputFor, useItemPricing, type ItemPrice, type PricedDraft } from './useItemPricing';
import { invalidateOrderViews } from '@/lib/queries';
import { ClientPicker } from '@/components/clients/ClientPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

// Montaj narxi tanlovida "qo'lda kiritish" varianti
const MANUAL_INSTALL = '__manual__';
import { useToast } from '@/components/ui/Toast';

// Ota komponent faqat ochiq paytda render qiladi — har ochilishda holat toza boshlanadi
interface Props {
  open: boolean;
  onClose: () => void;
  initialItems?: OrderItemInput[];
  initialNeedsDesign?: boolean;
  initialNeedsInstallation?: boolean;
  /** Saytdan kelgan arizadan ochilganda */
  initialClient?: Client | null;
  initialSource?: OrderSource;
  initialNotes?: string;
  /** Berilsa — forma shu buyurtmani tahrirlaydi */
  order?: OrderDetail;
}

// O'lcham metrda kiritiladi; narx tur/material + xizmatlar + dizayn + montajdan avtomatik hisoblanadi
interface ItemDraft extends PricedDraft {
  /** Narxlar ro'yxatida yo'q eski pardozlash nomlari — o'zgarishsiz saqlanadi */
  extraFinishing: string[];
  /** Tahrirdagi asl ro'yxat: tarkib o'zgarmasa aynan shu yuboriladi */
  initialFinishing?: string[];
  unitPrice: string;
}

const blankItem = (): ItemDraft => ({
  productType: '', materialId: '', width: '', height: '', quantity: '1', services: [], extraFinishing: [], unitPrice: '', manual: false,
});

// Tahrirdagi va kalkulyatordan kelgan narx tayyor — qayta hisoblanmaydi (manual)
const toDraft = (i: Omit<OrderItemInput, 'unitPrice'> & { unitPrice?: number }, catalog: PriceListItem[]): ItemDraft => {
  const byName = (n: string) => catalog.find((c) => c.kind === 'FINISHING' && c.name.toLowerCase() === n.trim().toLowerCase());
  return {
    productType: i.productType, materialId: i.materialId ?? '', width: cmToMeters(i.widthCm), height: cmToMeters(i.heightCm),
    quantity: String(i.quantity),
    services: i.finishing.flatMap((n) => byName(n)?.code ?? []),
    extraFinishing: i.finishing.filter((n) => !byName(n)),
    initialFinishing: i.finishing,
    unitPrice: String(i.unitPrice ?? ''),
    manual: true,
  };
};

function finishingNames(it: ItemDraft, catalog: PriceListItem[]): string[] {
  const names = [...it.services.map((c) => catalog.find((p) => p.code === c)?.name ?? c), ...it.extraFinishing];
  // Katta-kichik harf farqi "o'zgarish" emas — aks holda tarkib o'zgarmasa ham yuboriladi (menejerga 403)
  const norm = (l: string[]) => l.map((n) => n.trim().toLowerCase()).sort().join('|');
  const same = it.initialFinishing && norm(names) === norm(it.initialFinishing);
  return same ? it.initialFinishing! : names;
}

const isoToInput = (iso: string | null | undefined) => (iso ? toDateInput(new Date(iso)) : '');
// Sana o'zgarmagan bo'lsa asl vaqt saqlanadi (tahrirda muddat soati siljimasin), yangi sana — kun oxiri 18:00
const keepIso = (input: string, original: string | null | undefined) =>
  !input ? null : original && isoToInput(original) === input ? original : new Date(`${input}T18:00:00`).toISOString();

// Tez buyurtma: 1 daqiqada to'ldiriladigan forma; `order` berilsa — o'sha buyurtmani tahrirlash
export function OrderFormModal({
  open, onClose, initialItems, initialNeedsDesign = true, initialNeedsInstallation = false, initialClient = null, initialSource = 'WALK_IN', initialNotes = '', order,
}: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [client, setClient] = React.useState<Pick<Client, 'id' | 'name'> | null>(order?.client ?? initialClient);
  const [source, setSource] = React.useState<OrderSource>(order?.source ?? initialSource);
  // Qayta urinishsiz: yuklanmasa forma kutib qolmasin
  const { data: prices, isError: pricesFailed } = useQuery({ queryKey: ['prices'], queryFn: settingsApi.prices, enabled: open, retry: 0 });
  const catalog = prices ?? [];
  const start = order?.items ?? initialItems;
  // Eski pardozlash nomlarini xizmat kodlariga moslash uchun narxlar ro'yxati kerak
  const [items, setItems] = React.useState<ItemDraft[] | null>(start?.length ? null : [blankItem()]);
  React.useEffect(() => {
    // Narxlar yuklanmasa ham forma ochilsin — pardozlash nomlari "Boshqa" sifatida saqlanadi
    if (items === null && (prices || pricesFailed)) setItems(start!.map((i) => toDraft(i, prices ?? [])));
  }, [items, prices, pricesFailed, start]);
  const [deadline, setDeadline] = React.useState(isoToInput(order?.deadline));
  const [needsDesign, setNeedsDesign] = React.useState(order?.needsDesign ?? initialNeedsDesign);
  const [designerId, setDesignerId] = React.useState(order?.designerId ?? '');
  const [needsInstallation, setNeedsInstallation] = React.useState(order?.needsInstallation ?? initialNeedsInstallation);
  // undefined — hali tanlanmagan: eng arzon montaj narxi olinadi; '' — narxsiz; MANUAL — summa qo'lda
  const [installChoice, setInstallChoice] = React.useState<string | undefined>(order?.installationPrice ? MANUAL_INSTALL : undefined);
  const [installAmount, setInstallAmount] = React.useState(order?.installationPrice ? String(order.installationPrice) : '');
  const [address, setAddress] = React.useState(order?.installationAddress ?? '');
  const [discount, setDiscount] = React.useState(order?.discount ? String(order.discount) : '');
  const [dueDate, setDueDate] = React.useState(isoToInput(order?.dueDate));
  const [notes, setNotes] = React.useState(order?.notes ?? initialNotes);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { data: productTypes } = useQuery({ queryKey: ['product-types'], queryFn: settingsApi.productTypes, enabled: open });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: () => inventoryApi.materials(), enabled: open });
  const { data: designers } = useQuery({
    queryKey: ['users', 'DESIGNER'], queryFn: () => usersApi.list({ role: 'DESIGNER', active: true }), enabled: open,
  });

  const services = activeOfKind(catalog, 'FINISHING');
  // Standart — eng arzon montaj (o'rnatish belgilansa narxsiz qolib ketmasin)
  const installPrices = [...activeOfKind(catalog, 'INSTALLATION')].sort((a, b) => a.price - b.price);
  const manualInstall = needsInstallation && installChoice === MANUAL_INSTALL;
  const installationCode = needsInstallation && !manualInstall ? installChoice ?? installPrices[0]?.code ?? '' : '';
  const installationPrice = manualInstall ? parseMoney(installAmount) ?? 0 : 0;
  const list = items ?? [];

  const patchItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems((l) => (l ?? []).map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const updateItem = (idx: number, k: 'materialId' | 'width' | 'height' | 'quantity', v: string) => patchItem(idx, { [k]: v });

  const pricing = { types: productTypes, prices, needsDesign, installationCode };
  const results = useItemPricing(list, pricing, (idx, unitPrice) =>
    setItems((l) => (l ?? []).map((it, i) => (i === idx && !it.manual && it.unitPrice !== String(unitPrice) ? { ...it, unitPrice: String(unitPrice) } : it))));
  const canAuto = (it: ItemDraft) => priceInputFor({ ...it, manual: false }, false, pricing) !== null;
  const installLost = !!installationCode && installationIndex(list, pricing) === -1;

  const lineTotal = (i: ItemDraft) => (parseMoney(i.unitPrice) ?? 0) * (parseDecimal(i.quantity) ?? 0);
  const subtotal = list.reduce((s, i) => s + lineTotal(i), 0);
  const total = Math.max(0, subtotal + installationPrice - (parseMoney(discount) ?? 0));

  // Ro'yxatdagi tur tanlansa — asosiy materiali va doimiy xizmatlari qo'yiladi, narx yana avtomatik
  const changeType = (idx: number, name: string) => {
    const t = findType(productTypes, name);
    const it = list[idx]!;
    const active = new Set(services.map((x) => x.code));
    patchItem(idx, {
      productType: name,
      ...(t && {
        manual: false,
        services: t.serviceCodes.filter((c) => active.has(c)),
        ...(t.defaultMaterialId && !it.materialId && { materialId: t.defaultMaterialId }),
      }),
    });
  };

  const addType = useMutation({
    mutationFn: (it: ItemDraft) => settingsApi.createProductType({ name: it.productType.trim(), defaultMaterialId: it.materialId || null }),
    onSuccess: (t) => {
      toast.success(`"${t.name}" ro'yxatga qo'shildi. Narxini "Mahsulot turlari" sahifasida qo'ying`);
      qc.invalidateQueries({ queryKey: ['product-types'] });
    },
    onError: toast.error,
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!client) e.client = 'Mijozni tanlang';
    list.forEach((i, idx) => {
      if (!i.productType.trim()) e[`item${idx}`] = 'Mahsulot turini kiriting';
      else if (metersToCm(i.width) === null || metersToCm(i.height) === null) e[`item${idx}`] = 'O\'lchamni metrda kiriting, masalan 1,20';
      else if (!Number.isInteger(parseDecimal(i.quantity)) || (parseDecimal(i.quantity) ?? 0) < 1) e[`item${idx}`] = 'Soni butun son bo\'lishi kerak';
      else if (!i.manual && !canAuto(i)) e[`item${idx}`] = 'Bu tur uchun narx yo\'q — dona narxini qo\'lda yozing';
      // Avtomatik narx joriy ma'lumot bo'yicha hisoblangan bo'lishi shart (eski o'lcham narxi saqlanmasin)
      else if (!i.manual && typeof results[idx] === 'string') e[`item${idx}`] = results[idx] as string;
      else if (!i.manual && (!results[idx] || String((results[idx] as { unitPrice: number }).unitPrice) !== i.unitPrice)) e[`item${idx}`] = 'Narx hisoblanmoqda — bir soniyadan keyin qayta bosing';
      else if (parseMoney(i.unitPrice) === null) e[`item${idx}`] = 'Narxni raqam bilan kiriting';
    });
    // O'z vaqtida topshirish bonusi (KPI) muddatga qarab hisoblanadi
    if (!deadline) e.deadline = 'Topshirish muddatini kiriting';
    else if (deadline < toDateInput(new Date()) && deadline !== isoToInput(order?.deadline)) e.deadline = 'Muddat o\'tgan sana bo\'lishi mumkin emas';
    if (needsInstallation && !address.trim()) e.address = 'O\'rnatish manzilini kiriting';
    if (manualInstall && !parseMoney(installAmount)) e.installAmount = 'Montaj summasini kiriting';
    if (discount.trim() && parseMoney(discount) === null) e.discount = 'Chegirmani raqam bilan kiriting';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const body = (): OrderInput => ({
      clientId: client!.id,
      source,
      items: list.map((i) => ({
        productType: i.productType.trim(),
        materialId: i.materialId || null,
        widthCm: metersToCm(i.width)!,
        heightCm: metersToCm(i.height)!,
        quantity: parseDecimal(i.quantity)!,
        finishing: finishingNames(i, catalog),
        unitPrice: parseMoney(i.unitPrice)!,
      })),
      discount: parseMoney(discount) ?? 0,
      installationPrice,
      deadline: keepIso(deadline, order?.deadline),
      dueDate: keepIso(dueDate, order?.dueDate),
      needsDesign,
      designerId: needsDesign && designerId ? designerId : null,
      needsInstallation,
      installationAddress: needsInstallation ? address.trim() : null,
      notes: notes.trim() || null,
  });

  // Tahrirda tarkib/chegirma o'zgarmagan bo'lsa yuborilmaydi — ishlab chiqarishdagi buyurtmaning
  // muddati yoki izohini menejer ham o'zgartira olsin (tarkibini faqat admin)
  const changesOnly = (o: OrderDetail, b: OrderInput): Partial<OrderInput> => {
    const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
    const original = o.items.map((i) => ({
      productType: i.productType, materialId: i.materialId ?? null, widthCm: i.widthCm, heightCm: i.heightCm,
      quantity: i.quantity, finishing: i.finishing, unitPrice: i.unitPrice,
    }));
    const { items: newItems, discount: newDiscount, installationPrice: newInstall, ...rest } = b;
    return {
      ...rest,
      ...(!same(newItems, original) && { items: newItems }),
      ...(newDiscount !== (o.discount ?? 0) && { discount: newDiscount }),
      ...(newInstall !== (o.installationPrice ?? 0) && { installationPrice: newInstall }),
    };
  };

  const save = useMutation({
    mutationFn: () => (order ? ordersApi.update(order.id, changesOnly(order, body())) : ordersApi.create(body())),
    onSuccess: (saved) => {
      toast.success(order ? 'Buyurtma saqlandi' : `Buyurtma ${saved.number} yaratildi`);
      invalidateOrderViews(qc);
      if (order) qc.invalidateQueries({ queryKey: ['order', order.id] });
      onClose();
      if (!order) navigate(`/orders/${saved.id}`);
    },
    onError: toast.error,
  });

  const submit = () => items !== null && validate() && save.mutate();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={order ? `${order.number} — tahrirlash` : 'Yangi buyurtma'}
      size="xl"
      footer={(
        <>
          <span className="mr-auto self-center text-lg font-bold text-gray-900">Jami: {formatCurrency(total)}</span>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={submit}>{order ? 'Saqlash' : 'Buyurtma yaratish'}</Button>
        </>
      )}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><ClientPicker value={client} onChange={(c) => { setClient(c); if (c) setSource(c.source); }} error={errors.client} /></div>
          <Select label="Manba" value={source} onChange={(e) => setSource(e.target.value as OrderSource)} options={options(SOURCE_LABELS)} />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">Mahsulotlar</p>
          <datalist id="product-types">{productTypes?.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.name} />)}</datalist>
          {items === null && <p className="text-sm text-gray-500">Yuklanmoqda…</p>}
          {list.map((it, idx) => {
            const t = findType(productTypes, it.productType);
            return (
            <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-8">
                <div className="col-span-2">
                  <Input label="Turi" list="product-types" value={it.productType} onChange={(e) => changeType(idx, e.target.value)} />
                  {t && productPriceLabel(t) && <p className="mt-1 text-xs text-gray-500">{productPriceLabel(t)}</p>}
                  {it.productType.trim() && productTypes && !t && (
                    <button
                      type="button"
                      disabled={addType.isPending}
                      onClick={() => addType.mutate(it)}
                      className="mt-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      + Ro'yxatga qo'shish
                    </button>
                  )}
                </div>
                <div className="col-span-2">
                  <Select
                    label="Material"
                    value={it.materialId}
                    onChange={(e) => updateItem(idx, 'materialId', e.target.value)}
                    placeholder="—"
                    options={(materials ?? []).map((m) => ({ value: m.id, label: m.name }))}
                  />
                </div>
                <Input label="Eni, m" inputMode="decimal" placeholder="1,40" value={it.width} onChange={(e) => updateItem(idx, 'width', e.target.value)} />
                <Input label="Bo'yi, m" inputMode="decimal" placeholder="1,20" value={it.height} onChange={(e) => updateItem(idx, 'height', e.target.value)} />
                <Input label="Soni" inputMode="numeric" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                <div className="col-span-2 md:col-span-1">
                  <Input
                    label={it.manual ? 'Dona narxi (qo\'lda)' : 'Dona narxi'} money
                    inputMode="numeric"
                    value={it.unitPrice}
                    // Qo'lda yozilsa avtomatik hisobdan uziladi
                    onChange={(e) => patchItem(idx, { unitPrice: e.target.value, manual: true })}
                  />
                </div>
                <div className="col-span-2 md:col-span-6">
                  <p className="mb-1.5 text-xs font-medium text-gray-500">Xizmatlar</p>
                  <ServiceChips services={services} value={it.services} onChange={(codes) => patchItem(idx, { services: codes })} showPrice />
                  {it.extraFinishing.length > 0 && <p className="mt-1 text-xs text-gray-400">Boshqa: {it.extraFinishing.join(', ')}</p>}
                </div>
                <div className="col-span-2 flex items-end justify-end gap-3 pb-2">
                  {it.manual && canAuto(it) && (
                    <button
                      type="button"
                      onClick={() => patchItem(idx, { manual: false })}
                      title="Narx qo'lda — o'lcham, xizmat yoki montaj o'zgarsa qayta hisoblanmaydi"
                      className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      <RotateCcw className="h-3 w-3" />Avtomatik narx
                    </button>
                  )}
                  {list.length > 1 && (
                    <button type="button" onClick={() => setItems((l) => (l ?? []).filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700" aria-label="O'chirish">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <ItemSummary it={it} total={lineTotal(it)} res={results[idx] ?? null} auto={!it.manual && canAuto(it)} canAutoHint={canAuto(it)} />
              {errors[`item${idx}`] && <p className="mt-2 text-xs text-red-500">{errors[`item${idx}`]}</p>}
            </div>
            );
          })}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setItems((l) => [...(l ?? []), blankItem()])}>
            <Plus className="h-4 w-4" /> Yana mahsulot
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Topshirish muddati *" type="date" min={toDateInput(new Date())} value={deadline} onChange={(e) => setDeadline(e.target.value)} error={errors.deadline} />
          <Input label="Chegirma (so'm)" money inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} error={errors.discount} />
          <Input label="Nasiya: to'lov muddati" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-gray-100 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={needsDesign} onChange={(e) => setNeedsDesign(e.target.checked)} /> Dizayn kerak
            </label>
            {needsDesign && (
              <Select
                label="Dizayner"
                value={designerId}
                onChange={(e) => setDesignerId(e.target.value)}
                placeholder="Keyin tayinlanadi"
                options={(designers ?? []).map((d) => ({ value: d.id, label: d.fullName }))}
              />
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-gray-100 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={needsInstallation} onChange={(e) => setNeedsInstallation(e.target.checked)} /> O'rnatish kerak
            </label>
            {needsInstallation && (
              <>
                <Input label="Manzil" value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} />
                <Select
                  label="Montaj narxi"
                  value={manualInstall ? MANUAL_INSTALL : installationCode}
                  onChange={(e) => setInstallChoice(e.target.value)}
                  placeholder="Narxsiz"
                  options={[
                    ...installPrices.map((p) => ({ value: p.code, label: `${p.name} — ${formatCurrency(p.price)}/${PRICE_UNIT_LABELS[p.unit]}` })),
                    { value: MANUAL_INSTALL, label: 'Qo\'lda kiritish' },
                  ]}
                />
                {manualInstall && (
                  <Input label="Montaj summasi (so'm)" money value={installAmount} onChange={(e) => setInstallAmount(e.target.value)} error={errors.installAmount} autoFocus />
                )}
                {installLost && (
                  <p className="text-xs text-amber-700">Montaj narxi qo'shilmadi: mahsulotlar narxi qo'lda. Uni dona narxiga qo'shing yoki "Avtomatik narx"ni bosing</p>
                )}
              </>
            )}
          </div>
        </div>

        <Textarea label="Izoh" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

// "Banner: 1,68 m² × 45 000 so'm", qat'iy narx — "Oddiy o'rnatish: 150 000 so'm"
function lineText(l: PriceLine): string {
  if (l.unit === 'FIXED') return `${l.name}: ${formatCurrency(l.total)}`;
  const amount = formatNumber(l.amount, Number.isInteger(l.amount) ? 0 : 2).replace('.', ',');
  return `${l.name}: ${amount} ${PRICE_UNIT_LABELS[l.unit]} × ${formatCurrency(l.price)}`;
}

// "1,40 × 1,20 = 1,68 m² · Banner 1,68 m² × 45 000 · Luvers 6 dona × 2 000 · jami 87 600 so'm"
function ItemSummary({ it, total, res, auto, canAutoHint }: { it: ItemDraft; total: number; res: ItemPrice; auto: boolean; canAutoHint: boolean }) {
  const area = areaFromMeters(it.width, it.height);
  if (area <= 0) return null;
  const qty = parseDecimal(it.quantity) ?? 0;
  return (
    <div className="mt-2 space-y-1 text-sm text-gray-600">
      <p>
        {it.width} × {it.height} = <b className="text-gray-900">{formatArea(area)}</b>
        {qty > 1 && <> · {qty} dona = {formatArea(area * qty)}</>}
        {' · '}jami <b className="text-gray-900">{formatCurrency(total)}</b>
      </p>
      {auto && typeof res === 'string' && <p className="text-xs text-red-600">{res}</p>}
      {auto && res && typeof res !== 'string' && (
        <p className="text-xs text-gray-500">
          {res.lines.map(lineText).join(' · ')}
        </p>
      )}
      {it.manual && canAutoHint && <p className="text-xs text-gray-400">Narx qo'lda — o'lcham yoki xizmat o'zgarsa qayta hisoblanmaydi</p>}
      {!auto && !it.manual && <p className="text-xs text-amber-700">Bu tur uchun narx yo'q — dona narxini qo'lda yozing yoki turga narx qo'ying</p>}
    </div>
  );
}
