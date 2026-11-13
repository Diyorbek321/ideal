import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { inventoryApi, ordersApi, paymentsApi, settingsApi, usersApi, type OrderInput, type OrderItemInput } from '@/api';
import type { Client, OrderDetail, OrderSource, PriceLine, PriceListItem } from '@/types';
import { PRICE_UNIT_LABELS, SOURCE_LABELS, options } from '@/lib/labels';
import { toDateInput, formatCurrency, formatNumber, parseDecimal, parseMoney } from '@/lib/utils';
import { areaFromMeters, cmToMeters, formatArea, metersToCm } from '@/lib/size';
import { activeOfKind, findType, productPriceLabel } from '@/lib/pricing';
import { confirmBigAmount } from '@/lib/bigAmount';
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
  /** Bitta mahsulotning o'lchamlari bir guruh: tur, material, xizmatlar umumiy */
  group: string;
  /** Qo'lda yozilgan qator summasi ('' — dona narxi × soni) */
  sum: string;
}

/** Bitta mahsulotga "+" bilan qo'shiladigan o'lchamlar soni */
const MAX_SIZES = 5;
let groupSeq = 0;
const newGroup = () => `g${++groupSeq}`;

const blankItem = (group = newGroup()): ItemDraft => ({
  productType: '', materialId: '', width: '', height: '', quantity: '1', services: [], extraFinishing: [], unitPrice: '', manual: false,
  group, sum: '',
});

/** Saqlangan qatorning summasi dona narxi × sonidan farq qilsa — u qo'lda yozilgan */
const manualTotal = (i: { unitPrice?: number; quantity: number; total?: number }): number | undefined =>
  i.total !== undefined && i.unitPrice !== undefined && i.total !== i.unitPrice * i.quantity ? i.total : undefined;

type SourceItem = Omit<OrderItemInput, 'unitPrice'> & { unitPrice?: number };

// Tahrirdagi va kalkulyatordan kelgan narx tayyor — qayta hisoblanmaydi (manual)
const toDraft = (i: SourceItem, catalog: PriceListItem[], group: string): ItemDraft => {
  const byName = (n: string) => catalog.find((c) => c.kind === 'FINISHING' && c.name.toLowerCase() === n.trim().toLowerCase());
  const sum = manualTotal(i);
  return {
    productType: i.productType, materialId: i.materialId ?? '', width: cmToMeters(i.widthCm), height: cmToMeters(i.heightCm),
    quantity: String(i.quantity),
    services: i.finishing.flatMap((n) => byName(n)?.code ?? []),
    extraFinishing: i.finishing.filter((n) => !byName(n)),
    initialFinishing: i.finishing,
    unitPrice: String(i.unitPrice ?? ''),
    manual: true,
    group,
    sum: sum === undefined ? '' : String(sum),
  };
};

// Ketma-ket kelgan bir xil mahsulot (tur, material, xizmatlar) qatorlari bitta kartada o'lcham sifatida ko'rinadi
const toDrafts = (list: SourceItem[], catalog: PriceListItem[]): ItemDraft[] => {
  const sig = (i: SourceItem) => JSON.stringify([i.productType, i.materialId ?? null, i.finishing]);
  const out: ItemDraft[] = [];
  list.forEach((i, idx) => {
    const prev = out[idx - 1];
    const size = prev ? out.filter((d) => d.group === prev.group).length : 0;
    const same = prev && sig(list[idx - 1]!) === sig(i) && size < MAX_SIZES;
    out.push(toDraft(i, catalog, same ? prev.group : newGroup()));
  });
  return out;
};

/** Guruhlar tartibi bo'yicha: [guruh, [qatorning umumiy ro'yxatdagi indekslari]] */
function groupsOf(list: ItemDraft[]): Array<[string, number[]]> {
  const map = new Map<string, number[]>();
  list.forEach((it, idx) => map.set(it.group, [...(map.get(it.group) ?? []), idx]));
  return [...map.entries()];
}

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
    if (items === null && (prices || pricesFailed)) setItems(toDrafts(start!, prices ?? []));
  }, [items, prices, pricesFailed, start]);
  const [deadline, setDeadline] = React.useState(isoToInput(order?.deadline));
  const [needsDesignChoice, setNeedsDesign] = React.useState(order?.needsDesign ?? initialNeedsDesign);
  // Faqat o'rnatish: mahsulot bizda chiqarilmaydi — dizayn va ishlab chiqarishsiz, summa = montaj narxi
  const [installationOnly, setInstallationOnly] = React.useState(order?.installationOnly ?? false);
  const canToggleInstallOnly = !order || order.status === 'YANGI' || order.status === 'NARX_HISOBLANDI';
  const [designerId, setDesignerId] = React.useState(order?.designerId ?? '');
  const [needsInstallationChoice, setNeedsInstallation] = React.useState(order?.needsInstallation ?? initialNeedsInstallation);
  const needsDesign = !installationOnly && needsDesignChoice;
  const needsInstallation = installationOnly || needsInstallationChoice;
  // undefined — hali tanlanmagan: eng arzon montaj narxi olinadi; '' — narxsiz; MANUAL — summa qo'lda
  const [installChoice, setInstallChoice] = React.useState<string | undefined>(order?.installationPrice ? MANUAL_INSTALL : undefined);
  const [installAmount, setInstallAmount] = React.useState(order?.installationPrice ? String(order.installationPrice) : '');
  const [address, setAddress] = React.useState(order?.installationAddress ?? '');
  const [discount, setDiscount] = React.useState(order?.discount ? String(order.discount) : '');
  const [dueDate, setDueDate] = React.useState(isoToInput(order?.dueDate));
  const [notes, setNotes] = React.useState(order?.notes ?? initialNotes);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Perechisleniya: mijozning oldindan to'lovi — buyurtma summasi shundan o'zi ayiriladi
  const { data: clientLedger } = useQuery({
    queryKey: ['client-balance', client?.id],
    queryFn: () => paymentsApi.balance(client!.id),
    enabled: open && !!client,
  });
  const clientBalance = clientLedger?.balance ?? 0;
  const { data: productTypes } = useQuery({ queryKey: ['product-types'], queryFn: settingsApi.productTypes, enabled: open });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: () => inventoryApi.materials(), enabled: open });
  const { data: designers } = useQuery({
    queryKey: ['users', 'DESIGNER'], queryFn: () => usersApi.list({ role: 'DESIGNER', active: true }), enabled: open,
  });

  const services = activeOfKind(catalog, 'FINISHING');
  // Standart — eng arzon montaj (o'rnatish belgilansa narxsiz qolib ketmasin)
  const installPrices = [...activeOfKind(catalog, 'INSTALLATION')].sort((a, b) => a.price - b.price);
  // Faqat o'rnatishda mahsulot yo'q — katalog montaji biror mahsulotga qo'shilolmaydi, summa qo'lda
  const manualInstall = needsInstallation && (installationOnly || installChoice === MANUAL_INSTALL);
  const installationCode = needsInstallation && !manualInstall ? installChoice ?? installPrices[0]?.code ?? '' : '';
  const installationPrice = manualInstall ? parseMoney(installAmount) ?? 0 : 0;
  const list = installationOnly ? [] : items ?? [];

  const patchItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems((l) => (l ?? []).map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const updateItem = (idx: number, k: 'width' | 'height', v: string) => patchItem(idx, { [k]: v });
  // Tur, material, xizmatlar — mahsulotning barcha o'lchamlariga umumiy
  const patchGroup = (group: string, patch: (it: ItemDraft) => Partial<ItemDraft>) =>
    setItems((l) => (l ?? []).map((it) => (it.group === group ? { ...it, ...patch(it) } : it)));
  // Summa qo'lda yozilgan bo'lsa soni o'zgarganda summa saqlanadi, dona narxi qayta bo'linadi
  const changeQuantity = (idx: number, v: string) => {
    const it = list[idx]!;
    const sum = parseMoney(it.sum), q = parseDecimal(v);
    patchItem(idx, { quantity: v, ...(it.sum && sum !== null && q && q > 0 && { unitPrice: String(Math.round(sum / q)) }) });
  };
  const changeSum = (idx: number, v: string) => {
    const sum = parseMoney(v), q = parseDecimal(list[idx]!.quantity);
    patchItem(idx, {
      sum: v, manual: true,
      ...(sum !== null && q && q > 0 && { unitPrice: String(Math.round(sum / q)) }),
    });
  };
  const addSize = (group: string) => setItems((l) => {
    const cur = l ?? [];
    const last = cur.map((it) => it.group).lastIndexOf(group);
    const base = cur[last]!;
    // Tur, material va xizmatlar ko'chiriladi, o'lcham va narx — yangidan
    const size: ItemDraft = { ...blankItem(group), productType: base.productType, materialId: base.materialId, services: base.services, extraFinishing: base.extraFinishing, initialFinishing: base.initialFinishing, manual: base.manual && sumOnly(base) };
    return [...cur.slice(0, last + 1), size, ...cur.slice(last + 1)];
  });

  const pricing = { types: productTypes, prices, needsDesign, installationCode };
  const results = useItemPricing(list, pricing, (idx, unitPrice) =>
    setItems((l) => (l ?? []).map((it, i) => (i === idx && !it.manual && it.unitPrice !== String(unitPrice) ? { ...it, unitPrice: String(unitPrice) } : it))));
  const canAuto = (it: ItemDraft) => priceInputFor({ ...it, manual: false }, false, pricing) !== null;
  const installLost = !!installationCode && installationIndex(list, pricing) === -1;

  const lineTotal = (i: ItemDraft) =>
    i.sum.trim() ? parseMoney(i.sum) ?? 0 : (parseMoney(i.unitPrice) ?? 0) * (parseDecimal(i.quantity) ?? 0);
  const subtotal = list.reduce((s, i) => s + lineTotal(i), 0);
  const total = Math.max(0, subtotal + installationPrice - (parseMoney(discount) ?? 0));

  // Ro'yxatdagi tur tanlansa — asosiy materiali va doimiy xizmatlari qo'yiladi, narx yana avtomatik
  const sumOnly = (it: ItemDraft) => !!findType(productTypes, it.productType)?.skipProduction;
  const changeType = (group: string, name: string) => {
    const t = findType(productTypes, name);
    const active = new Set(services.map((x) => x.code));
    patchGroup(group, (it) => ({
      productType: name,
      ...(t && {
        // Hajmli harf: o'lchamsiz, summa qo'lda
        manual: t.skipProduction || !!it.sum,
        ...(t.skipProduction && { width: '', height: '', sum: '' }),
        services: t.serviceCodes.filter((c) => active.has(c)),
        ...(t.defaultMaterialId && !it.materialId && { materialId: t.defaultMaterialId }),
      }),
    }));
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
      else if (sumOnly(i) && !parseMoney(i.unitPrice)) e[`item${idx}`] = 'Summani kiriting';
      else if (!sumOnly(i) && (metersToCm(i.width) === null || metersToCm(i.height) === null)) e[`item${idx}`] = 'O\'lchamni metrda kiriting, masalan 1,20';
      else if (!Number.isInteger(parseDecimal(i.quantity)) || (parseDecimal(i.quantity) ?? 0) < 1) e[`item${idx}`] = 'Soni butun son bo\'lishi kerak';
      else if (i.sum.trim() && parseMoney(i.sum) === null) e[`item${idx}`] = 'Summani raqam bilan kiriting';
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
        // Hajmli harf — o'lchamsiz (0), faqat summa
        widthCm: sumOnly(i) ? 0 : metersToCm(i.width)!,
        heightCm: sumOnly(i) ? 0 : metersToCm(i.height)!,
        quantity: parseDecimal(i.quantity)!,
        finishing: finishingNames(i, catalog),
        unitPrice: parseMoney(i.unitPrice)!,
        ...(i.sum.trim() && { total: parseMoney(i.sum)! }),
      })),
      discount: parseMoney(discount) ?? 0,
      installationPrice,
      deadline: keepIso(deadline, order?.deadline),
      dueDate: keepIso(dueDate, order?.dueDate),
      needsDesign,
      designerId: needsDesign && designerId ? designerId : null,
      needsInstallation,
      installationOnly,
      installationAddress: needsInstallation ? address.trim() : null,
      notes: notes.trim() || null,
  });

  // Tahrirda tarkib/chegirma o'zgarmagan bo'lsa yuborilmaydi — ishlab chiqarishdagi buyurtmaning
  // muddati yoki izohini menejer ham o'zgartira olsin (tarkibini faqat admin)
  const changesOnly = (o: OrderDetail, b: OrderInput): Partial<OrderInput> => {
    const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
    const original = o.items.map((i) => {
      const total = manualTotal(i);
      return {
        productType: i.productType, materialId: i.materialId ?? null, widthCm: i.widthCm, heightCm: i.heightCm,
        quantity: i.quantity, finishing: i.finishing, unitPrice: i.unitPrice,
        ...(total !== undefined && { total }),
      };
    });
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

  // Butun partiya narxi dona narxi o'rniga yozilsa summa son baravar oshib ketadi (ID-2026-0036: 1040 × 524 000)
  const confirmTotal = () => {
    const biggest = [...list].sort((a, b) => lineTotal(b) - lineTotal(a))[0];
    const detail = biggest && (parseDecimal(biggest.quantity) ?? 0) > 1
      ? `Eng katta qator: ${biggest.productType || 'mahsulot'} — ${biggest.quantity} dona × ${formatCurrency(parseMoney(biggest.unitPrice) ?? 0)}. «Narx» bitta dona uchun yoziladi, butun partiya uchun emas.`
      : undefined;
    return confirmBigAmount(total, 'Buyurtma summasi', detail);
  };
  const submit = () => items !== null && validate() && confirmTotal() && save.mutate();

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
          <div className="md:col-span-2">
            <ClientPicker value={client} onChange={(c) => { setClient(c); if (c) setSource(c.source); }} error={errors.client} />
            {client && clientBalance > 0 && (
              <p className="mt-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                Balansida <b>{formatCurrency(clientBalance)}</b> oldindan to'lov bor — {order ? 'qo\'shimcha summa' : 'buyurtma summasi'} shundan avtomatik ayiriladi
                {!order && total > clientBalance && <>, qolgan <b>{formatCurrency(total - clientBalance)}</b> qarz bo'ladi</>}
              </p>
            )}
          </div>
          <Select label="Manba" value={source} onChange={(e) => setSource(e.target.value as OrderSource)} options={options(SOURCE_LABELS)} />
        </div>

        <label className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${installationOnly ? 'border-brand-200 bg-brand-50' : 'border-gray-100'}`}>
          <input type="checkbox" className="mt-0.5" checked={installationOnly} disabled={!canToggleInstallOnly}
            onChange={(e) => setInstallationOnly(e.target.checked)} />
          <span>
            <span className="font-medium text-gray-900">Faqat o'rnatish</span>
            <span className="block text-xs text-gray-500">Mahsulot bizda chiqarilmaydi (mijozniki yoki tayyor) — dizayn va ishlab chiqarishsiz to'g'ridan-to'g'ri o'rnatishga ketadi</span>
          </span>
        </label>

        {!installationOnly && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">Mahsulotlar</p>
          <datalist id="product-types">{productTypes?.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.name} />)}</datalist>
          {items === null && <p className="text-sm text-gray-500">Yuklanmoqda…</p>}
          {groupsOf(list).map(([group, idxs]) => {
            const head = list[idxs[0]!]!;
            const t = findType(productTypes, head.productType);
            const noSize = sumOnly(head);
            return (
            <div key={group} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-8">
                <div className="col-span-2 md:col-span-4">
                  <Input label="Turi" list="product-types" value={head.productType} onChange={(e) => changeType(group, e.target.value)} />
                  {t && productPriceLabel(t) && <p className="mt-1 text-xs text-gray-500">{productPriceLabel(t)}</p>}
                  {head.productType.trim() && productTypes && !t && (
                    <button
                      type="button"
                      disabled={addType.isPending}
                      onClick={() => addType.mutate(head)}
                      className="mt-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      + Ro'yxatga qo'shish
                    </button>
                  )}
                </div>
                <div className="col-span-2 md:col-span-3">
                  <Select
                    label="Material"
                    value={head.materialId}
                    onChange={(e) => patchGroup(group, () => ({ materialId: e.target.value }))}
                    placeholder="—"
                    options={(materials ?? []).map((m) => ({ value: m.id, label: m.name }))}
                  />
                </div>
                <div className="col-span-2 flex items-end justify-end pb-2 md:col-span-1">
                  {groupsOf(list).length > 1 && (
                    <button type="button" onClick={() => setItems((l) => (l ?? []).filter((x) => x.group !== group))} className="text-red-500 hover:text-red-700" aria-label="Mahsulotni o'chirish" title="Mahsulotni o'chirish">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {idxs.map((idx, n) => {
                  const it = list[idx]!;
                  return (
                  <div key={idx} className={idxs.length > 1 ? 'rounded-lg border border-gray-100 bg-white p-2' : ''}>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
                      {noSize ? (
                        <p className="col-span-2 self-end pb-2 text-xs text-gray-500 md:col-span-4">O'lcham shart emas · pechatnikka bormaydi, to'g'ri o'rnatishga</p>
                      ) : (<>
                        <div className="md:col-span-2">
                          <Input label={idxs.length > 1 ? `${n + 1}. Eni, m` : 'Eni, m'} inputMode="decimal" placeholder="1,40" value={it.width} onChange={(e) => updateItem(idx, 'width', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                          <Input label="Bo'yi, m" inputMode="decimal" placeholder="1,20" value={it.height} onChange={(e) => updateItem(idx, 'height', e.target.value)} />
                        </div>
                      </>)}
                      <div className="md:col-span-2">
                        <Input label="Soni" inputMode="numeric" value={it.quantity} onChange={(e) => changeQuantity(idx, e.target.value)} />
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          label={noSize ? 'Summa (dona)' : it.manual ? 'Dona narxi (qo\'lda)' : 'Dona narxi'} money
                          inputMode="numeric"
                          value={it.unitPrice}
                          // Qo'lda yozilsa avtomatik hisobdan uziladi; qator summasi dona narxidan qayta hisoblanadi
                          onChange={(e) => patchItem(idx, { unitPrice: e.target.value, manual: true, sum: '' })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label={it.sum ? 'Summa (qo\'lda)' : 'Summa'} money
                          inputMode="numeric"
                          value={it.sum || (lineTotal(it) ? String(lineTotal(it)) : '')}
                          onChange={(e) => changeSum(idx, e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 flex items-end justify-end gap-3 pb-2 md:col-span-1">
                        {it.manual && canAuto(it) && (
                          <button
                            type="button"
                            onClick={() => patchItem(idx, { manual: false, sum: '' })}
                            title="Avtomatik narx — narx qo'lda yozilgan, o'lcham yoki xizmat o'zgarsa qayta hisoblanmaydi"
                            aria-label="Avtomatik narx"
                            className="text-brand-700 hover:text-brand-900"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {idxs.length > 1 && (
                          <button type="button" onClick={() => setItems((l) => (l ?? []).filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700" aria-label="O'lchamni o'chirish" title="O'lchamni o'chirish">
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
                {!noSize && idxs.length < MAX_SIZES && (
                  <button type="button" onClick={() => addSize(group)} className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                    <Plus className="h-3.5 w-3.5" /> O'lcham qo'shish ({idxs.length}/{MAX_SIZES})
                  </button>
                )}
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-gray-500">Xizmatlar</p>
                <ServiceChips services={services} value={head.services} onChange={(codes) => patchGroup(group, () => ({ services: codes }))} showPrice />
                {head.extraFinishing.length > 0 && <p className="mt-1 text-xs text-gray-400">Boshqa: {head.extraFinishing.join(', ')}</p>}
              </div>
              {idxs.length > 1 && (
                <p className="mt-2 text-right text-sm text-gray-600">
                  Mahsulot jami: <b className="text-gray-900">{formatCurrency(idxs.reduce((s, i) => s + lineTotal(list[i]!), 0))}</b>
                </p>
              )}
            </div>
            );
          })}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setItems((l) => [...(l ?? []), blankItem()])}>
            <Plus className="h-4 w-4" /> Yana mahsulot
          </Button>
        </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Topshirish muddati *" type="date" min={toDateInput(new Date())} value={deadline} onChange={(e) => setDeadline(e.target.value)} error={errors.deadline} />
          <Input label="Chegirma (so'm)" money inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} error={errors.discount} />
          <Input label="Nasiya: to'lov muddati" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-gray-100 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={needsDesign} disabled={installationOnly} onChange={(e) => setNeedsDesign(e.target.checked)} /> Dizayn kerak
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
              <input type="checkbox" checked={needsInstallation} disabled={installationOnly} onChange={(e) => setNeedsInstallation(e.target.checked)} /> O'rnatish kerak
            </label>
            {needsInstallation && (
              <>
                <Input label="Manzil" value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} />
                {!installationOnly && <Select
                  label="Montaj narxi"
                  value={manualInstall ? MANUAL_INSTALL : installationCode}
                  onChange={(e) => setInstallChoice(e.target.value)}
                  placeholder="Narxsiz"
                  options={[
                    ...installPrices.map((p) => ({ value: p.code, label: `${p.name} — ${formatCurrency(p.price)}/${PRICE_UNIT_LABELS[p.unit]}` })),
                    { value: MANUAL_INSTALL, label: 'Qo\'lda kiritish' },
                  ]}
                />}
                {manualInstall && (
                  <Input label="Montaj summasi (so'm)" money value={installAmount} onChange={(e) => setInstallAmount(e.target.value)} error={errors.installAmount} autoFocus={!installationOnly} />
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
