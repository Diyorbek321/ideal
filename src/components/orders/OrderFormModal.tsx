import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { inventoryApi, ordersApi, settingsApi, usersApi, type OrderInput, type OrderItemInput } from '@/api';
import type { Client, OrderDetail, OrderSource } from '@/types';
import { SOURCE_LABELS, options } from '@/lib/labels';
import { toDateInput, formatCurrency, parseDecimal, parseMoney } from '@/lib/utils';
import { areaFromMeters, cmToMeters, formatArea, metersToCm } from '@/lib/size';
import { invalidateOrderViews } from '@/lib/queries';
import { ClientPicker } from '@/components/clients/ClientPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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

// O'lcham metrda kiritiladi; 1 m² narxi bo'lsa dona narxi = maydon × 1 m² narxi
interface ItemDraft {
  productType: string;
  materialId: string;
  width: string;
  height: string;
  quantity: string;
  finishing: string;
  pricePerM2: string;
  unitPrice: string;
}

const blankItem = (): ItemDraft => ({
  productType: '', materialId: '', width: '', height: '', quantity: '1', finishing: '', pricePerM2: '', unitPrice: '',
});

const toDraft = (i: Omit<OrderItemInput, 'unitPrice'> & { unitPrice?: number }): ItemDraft => ({
  productType: i.productType, materialId: i.materialId ?? '', width: cmToMeters(i.widthCm), height: cmToMeters(i.heightCm),
  quantity: String(i.quantity), finishing: i.finishing.join(', '), pricePerM2: '', unitPrice: String(i.unitPrice ?? ''),
});

const isoToInput = (iso: string | null | undefined) => (iso ? toDateInput(new Date(iso)) : '');
// Sana o'zgarmagan bo'lsa asl vaqt saqlanadi (tahrirda muddat soati siljimasin), yangi sana — kun oxiri 18:00
const keepIso = (input: string, original: string | null | undefined) =>
  !input ? null : original && isoToInput(original) === input ? original : new Date(`${input}T18:00:00`).toISOString();

// 1 m² narxi kiritilgan bo'lsa dona narxini qayta hisoblaydi
function withUnitPrice(it: ItemDraft): ItemDraft {
  const perM2 = parseMoney(it.pricePerM2);
  if (!perM2) return it;
  return { ...it, unitPrice: String(Math.round(areaFromMeters(it.width, it.height) * perM2)) };
}


// Tez buyurtma: 1 daqiqada to'ldiriladigan forma; `order` berilsa — o'sha buyurtmani tahrirlash
export function OrderFormModal({
  open, onClose, initialItems, initialNeedsDesign = true, initialNeedsInstallation = false, initialClient = null, initialSource = 'WALK_IN', initialNotes = '', order,
}: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [client, setClient] = React.useState<Pick<Client, 'id' | 'name'> | null>(order?.client ?? initialClient);
  const [source, setSource] = React.useState<OrderSource>(order?.source ?? initialSource);
  const [items, setItems] = React.useState<ItemDraft[]>(() => {
    const start = order?.items ?? initialItems;
    return start?.length ? start.map(toDraft) : [blankItem()];
  });
  const [deadline, setDeadline] = React.useState(isoToInput(order?.deadline));
  const [needsDesign, setNeedsDesign] = React.useState(order?.needsDesign ?? initialNeedsDesign);
  const [designerId, setDesignerId] = React.useState(order?.designerId ?? '');
  const [needsInstallation, setNeedsInstallation] = React.useState(order?.needsInstallation ?? initialNeedsInstallation);
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

  const lineTotal = (i: ItemDraft) => (parseMoney(i.unitPrice) ?? 0) * (parseDecimal(i.quantity) ?? 0);
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const total = Math.max(0, subtotal - (parseMoney(discount) ?? 0));
  const knownType = (name: string) => productTypes?.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());

  const patchItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((it, i) => (i === idx ? withUnitPrice({ ...it, ...patch }) : it)));
  const updateItem = (idx: number, k: keyof ItemDraft, v: string) => patchItem(idx, { [k]: v });

  // Ro'yxatdagi tur tanlansa — uning 1 m² narxi va materiali qo'yiladi
  const changeType = (idx: number, name: string) => {
    const t = knownType(name);
    const it = items[idx]!;
    patchItem(idx, {
      productType: name,
      ...(t && t.pricePerM2 > 0 && { pricePerM2: String(t.pricePerM2) }),
      ...(t?.defaultMaterialId && !it.materialId && { materialId: t.defaultMaterialId }),
    });
  };

  const addType = useMutation({
    mutationFn: (it: ItemDraft) => settingsApi.createProductType({
      name: it.productType.trim(),
      pricePerM2: parseMoney(it.pricePerM2) ?? 0,
      defaultMaterialId: it.materialId || null,
    }),
    onSuccess: (t) => { toast.success(`"${t.name}" ro'yxatga qo'shildi`); qc.invalidateQueries({ queryKey: ['product-types'] }); },
    onError: toast.error,
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!client) e.client = 'Mijozni tanlang';
    items.forEach((i, idx) => {
      if (!i.productType.trim()) e[`item${idx}`] = 'Mahsulot turini kiriting';
      else if (metersToCm(i.width) === null || metersToCm(i.height) === null) e[`item${idx}`] = 'O\'lchamni metrda kiriting, masalan 1,20';
      else if (!Number.isInteger(parseDecimal(i.quantity)) || (parseDecimal(i.quantity) ?? 0) < 1) e[`item${idx}`] = 'Soni butun son bo\'lishi kerak';
      else if (parseMoney(i.unitPrice) === null) e[`item${idx}`] = 'Narxni raqam bilan kiriting';
    });
    // O'z vaqtida topshirish bonusi (KPI) muddatga qarab hisoblanadi
    if (!deadline) e.deadline = 'Topshirish muddatini kiriting';
    else if (deadline < toDateInput(new Date()) && deadline !== isoToInput(order?.deadline)) e.deadline = 'Muddat o\'tgan sana bo\'lishi mumkin emas';
    if (needsInstallation && !address.trim()) e.address = 'O\'rnatish manzilini kiriting';
    if (discount.trim() && parseMoney(discount) === null) e.discount = 'Chegirmani raqam bilan kiriting';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const body = (): OrderInput => ({
      clientId: client!.id,
      source,
      items: items.map((i) => ({
        productType: i.productType.trim(),
        materialId: i.materialId || null,
        widthCm: metersToCm(i.width)!,
        heightCm: metersToCm(i.height)!,
        quantity: parseDecimal(i.quantity)!,
        finishing: i.finishing.split(',').map((f) => f.trim()).filter(Boolean),
        unitPrice: parseMoney(i.unitPrice)!,
      })),
      discount: parseMoney(discount) ?? 0,
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
    const { items: newItems, discount: newDiscount, ...rest } = b;
    return {
      ...rest,
      ...(!same(newItems, original) && { items: newItems }),
      ...(newDiscount !== (o.discount ?? 0) && { discount: newDiscount }),
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

  const submit = () => validate() && save.mutate();

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
          {items.map((it, idx) => (
            <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-8">
                <div className="col-span-2">
                  <Input label="Turi" list="product-types" value={it.productType} onChange={(e) => changeType(idx, e.target.value)} />
                  {it.productType.trim() && productTypes && !knownType(it.productType) && (
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
                <Input label="1 m² narxi" inputMode="numeric" value={it.pricePerM2} onChange={(e) => updateItem(idx, 'pricePerM2', e.target.value)} />
                <div className="col-span-2 md:col-span-4"><Input label="Pardozlash (vergul bilan)" value={it.finishing} onChange={(e) => updateItem(idx, 'finishing', e.target.value)} placeholder="Luvers, Laminatsiya" /></div>
                <div className="col-span-2">
                  <Input
                    label="Dona narxi"
                    inputMode="numeric"
                    value={it.unitPrice}
                    // Qo'lda yozilsa 1 m² narxidan uziladi
                    onChange={(e) => patchItem(idx, { unitPrice: e.target.value, pricePerM2: '' })}
                  />
                </div>
                <div className="col-span-2 flex items-end justify-end pb-2">
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems((l) => l.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700" aria-label="O'chirish">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <ItemSummary it={it} total={lineTotal(it)} />
              {errors[`item${idx}`] && <p className="mt-2 text-xs text-red-500">{errors[`item${idx}`]}</p>}
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setItems((l) => [...l, blankItem()])}>
            <Plus className="h-4 w-4" /> Yana mahsulot
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Topshirish muddati *" type="date" min={toDateInput(new Date())} value={deadline} onChange={(e) => setDeadline(e.target.value)} error={errors.deadline} />
          <Input label="Chegirma (so'm)" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} error={errors.discount} />
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
            {needsInstallation && <Input label="Manzil" value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} />}
          </div>
        </div>

        <Textarea label="Izoh" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

// "1,40 × 1,20 = 1,68 m² × 45 000 so'm = 75 600 so'm · 2 dona = 151 200 so'm"
function ItemSummary({ it, total }: { it: ItemDraft; total: number }) {
  const area = areaFromMeters(it.width, it.height);
  if (area <= 0) return null;
  const perM2 = parseMoney(it.pricePerM2);
  const qty = parseDecimal(it.quantity) ?? 0;
  return (
    <p className="mt-2 text-sm text-gray-600">
      {it.width} × {it.height} = <b className="text-gray-900">{formatArea(area)}</b>
      {perM2 ? <> × {formatCurrency(perM2)} = {formatCurrency(Math.round(area * perM2))}</> : null}
      {qty > 1 && <> · {qty} dona = {formatArea(area * qty)}</>}
      {' · '}jami <b className="text-gray-900">{formatCurrency(total)}</b>
    </p>
  );
}
