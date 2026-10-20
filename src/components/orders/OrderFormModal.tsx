import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { inventoryApi, ordersApi, settingsApi, usersApi, type OrderItemInput } from '@/api';
import type { Client, OrderSource } from '@/types';
import { SOURCE_LABELS, options } from '@/lib/labels';
import { formatCurrency, parseDecimal, parseMoney } from '@/lib/utils';
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
}

interface ItemDraft {
  productType: string;
  materialId: string;
  widthCm: string;
  heightCm: string;
  quantity: string;
  finishing: string;
  unitPrice: string;
}

const blankItem = (): ItemDraft => ({
  productType: '', materialId: '', widthCm: '', heightCm: '', quantity: '1', finishing: '', unitPrice: '',
});

const toDraft = (i: OrderItemInput): ItemDraft => ({
  productType: i.productType, materialId: i.materialId ?? '', widthCm: String(i.widthCm), heightCm: String(i.heightCm),
  quantity: String(i.quantity), finishing: i.finishing.join(', '), unitPrice: String(i.unitPrice),
});


// Tez buyurtma: 1 daqiqada to'ldiriladigan forma
export function OrderFormModal({ open, onClose, initialItems, initialNeedsDesign = true, initialNeedsInstallation = false }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [client, setClient] = React.useState<Client | null>(null);
  const [source, setSource] = React.useState<OrderSource>('WALK_IN');
  const [items, setItems] = React.useState<ItemDraft[]>(() => (initialItems?.length ? initialItems.map(toDraft) : [blankItem()]));
  const [deadline, setDeadline] = React.useState('');
  const [needsDesign, setNeedsDesign] = React.useState(initialNeedsDesign);
  const [designerId, setDesignerId] = React.useState('');
  const [needsInstallation, setNeedsInstallation] = React.useState(initialNeedsInstallation);
  const [address, setAddress] = React.useState('');
  const [discount, setDiscount] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { data: productTypes } = useQuery({ queryKey: ['product-types'], queryFn: settingsApi.productTypes, enabled: open });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: () => inventoryApi.materials(), enabled: open });
  const { data: designers } = useQuery({
    queryKey: ['users', 'DESIGNER'], queryFn: () => usersApi.list({ role: 'DESIGNER', active: true }), enabled: open,
  });

  const lineTotal = (i: ItemDraft) => (parseMoney(i.unitPrice) ?? 0) * (parseDecimal(i.quantity) ?? 0);
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const total = Math.max(0, subtotal - (parseMoney(discount) ?? 0));
  const area = (i: ItemDraft) => ((parseDecimal(i.widthCm) ?? 0) * (parseDecimal(i.heightCm) ?? 0)) / 10_000;

  const updateItem = (idx: number, k: keyof ItemDraft, v: string) =>
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!client) e.client = 'Mijozni tanlang';
    items.forEach((i, idx) => {
      if (!i.productType.trim()) e[`item${idx}`] = 'Mahsulot turini kiriting';
      else if (!((parseDecimal(i.widthCm) ?? 0) > 0 && (parseDecimal(i.heightCm) ?? 0) > 0)) e[`item${idx}`] = 'O\'lchamni to\'g\'ri kiriting (sm)';
      else if (!Number.isInteger(parseDecimal(i.quantity)) || (parseDecimal(i.quantity) ?? 0) < 1) e[`item${idx}`] = 'Soni butun son bo\'lishi kerak';
      else if (parseMoney(i.unitPrice) === null) e[`item${idx}`] = 'Narxni raqam bilan kiriting';
    });
    if (needsInstallation && !address.trim()) e.address = 'O\'rnatish manzilini kiriting';
    if (discount.trim() && parseMoney(discount) === null) e.discount = 'Chegirmani raqam bilan kiriting';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const create = useMutation({
    mutationFn: () => ordersApi.create({
      clientId: client!.id,
      source,
      items: items.map((i) => ({
        productType: i.productType.trim(),
        materialId: i.materialId || null,
        widthCm: parseDecimal(i.widthCm)!,
        heightCm: parseDecimal(i.heightCm)!,
        quantity: parseDecimal(i.quantity)!,
        finishing: i.finishing.split(',').map((f) => f.trim()).filter(Boolean),
        unitPrice: parseMoney(i.unitPrice)!,
      })),
      discount: parseMoney(discount) ?? 0,
      deadline: deadline ? new Date(`${deadline}T18:00:00`).toISOString() : null,
      dueDate: dueDate ? new Date(`${dueDate}T18:00:00`).toISOString() : null,
      needsDesign,
      designerId: needsDesign && designerId ? designerId : null,
      needsInstallation,
      installationAddress: needsInstallation ? address.trim() : null,
      notes: notes.trim() || null,
    }),
    onSuccess: (order) => {
      toast.success(`Buyurtma ${order.number} yaratildi`);
      invalidateOrderViews(qc);
      onClose();
      navigate(`/orders/${order.id}`);
    },
    onError: toast.error,
  });

  const submit = () => validate() && create.mutate();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yangi buyurtma"
      size="xl"
      footer={(
        <>
          <span className="mr-auto self-center text-lg font-bold text-gray-900">Jami: {formatCurrency(total)}</span>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={create.isPending} onClick={submit}>Buyurtma yaratish</Button>
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
                <div className="col-span-2"><Input label="Turi" list="product-types" value={it.productType} onChange={(e) => updateItem(idx, 'productType', e.target.value)} /></div>
                <div className="col-span-2">
                  <Select
                    label="Material"
                    value={it.materialId}
                    onChange={(e) => updateItem(idx, 'materialId', e.target.value)}
                    placeholder="—"
                    options={(materials ?? []).map((m) => ({ value: m.id, label: m.name }))}
                  />
                </div>
                <Input label="Eni, sm" inputMode="decimal" value={it.widthCm} onChange={(e) => updateItem(idx, 'widthCm', e.target.value)} />
                <Input label="Bo'yi, sm" inputMode="decimal" value={it.heightCm} onChange={(e) => updateItem(idx, 'heightCm', e.target.value)} />
                <Input label="Soni" inputMode="numeric" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                <Input label="Dona narxi" inputMode="numeric" value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                <div className="col-span-2 md:col-span-6"><Input label="Pardozlash (vergul bilan)" value={it.finishing} onChange={(e) => updateItem(idx, 'finishing', e.target.value)} placeholder="Luvers, Laminatsiya" /></div>
                <div className="col-span-2 flex items-end justify-between gap-2 pb-2">
                  <span className="text-sm text-gray-500">
                    {area(it) > 0 ? `${area(it).toFixed(2)} m² · ` : ''}
                    <b className="text-gray-900">{formatCurrency(lineTotal(it))}</b>
                  </span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems((l) => l.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700" aria-label="O'chirish">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {errors[`item${idx}`] && <p className="mt-2 text-xs text-red-500">{errors[`item${idx}`]}</p>}
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setItems((l) => [...l, blankItem()])}>
            <Plus className="mr-2 h-4 w-4" /> Yana mahsulot
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Topshirish muddati" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
