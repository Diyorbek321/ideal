import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { inventoryApi, settingsApi, type ProductTypeInput } from '@/api';
import type { Material, PriceListItem, ProductPriceUnit, ProductType } from '@/types';
import { cn, formatCurrency, parseMoney } from '@/lib/utils';
import { PRODUCT_UNIT_LABELS, activeOfKind } from '@/lib/pricing';
import { ServiceChips } from '@/components/pricing/ServiceChips';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const cellInput = 'h-8 w-28 rounded border border-gray-200 px-2';
const unitOptions = (Object.keys(PRODUCT_UNIT_LABELS) as ProductPriceUnit[]).map((u) => ({ value: u, label: `${PRODUCT_UNIT_LABELS[u]} uchun` }));

function useSaveType(id: string) {
  const toast = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ProductTypeInput>) => settingsApi.updateProductType(id, body),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['product-types'] }); },
    onError: toast.error,
  });
}

function TypeRow({ t, materials, services }: { t: ProductType; materials: Material[]; services: PriceListItem[] }) {
  const [price, setPrice] = React.useState(String(t.pricePerM2));
  const [cost, setCost] = React.useState(String(t.costPerM2));
  const save = useSaveType(t.id);
  const toast = useToast();
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => settingsApi.removeProductType(t.id),
    onSuccess: () => { toast.success('Mahsulot turi o\'chirildi'); qc.invalidateQueries({ queryKey: ['product-types'] }); },
    onError: toast.error,
  });
  const priceN = parseMoney(price);
  const costN = parseMoney(cost);
  const dirty = priceN !== t.pricePerM2 || costN !== t.costPerM2;
  const margin = priceN ? Math.round((((priceN ?? 0) - (costN ?? 0)) / priceN) * 100) : null;

  return (
    <>
    <tr className={cn(!t.isActive && 'opacity-40')}>
      <td className="pt-3 pr-2 font-medium">{t.name}</td>
      <td className="pt-3 pr-2">
        <select
          value={t.priceUnit}
          onChange={(e) => save.mutate({ priceUnit: e.target.value as ProductPriceUnit })}
          className="h-8 rounded border border-gray-200 px-2"
          aria-label="Narx birligi"
        >
          {unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td className="pt-3 pr-2"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className={cellInput} aria-label="Narx" /></td>
      <td className="pt-3 pr-2"><input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" className={cellInput} aria-label="Tannarx" /></td>
      <td className="pt-3 pr-2 text-gray-500">{margin === null ? '—' : `${margin}%`}</td>
      <td className="pt-3 pr-2">
        <select
          value={t.defaultMaterialId ?? ''}
          onChange={(e) => save.mutate({ defaultMaterialId: e.target.value || null })}
          className="h-8 max-w-40 rounded border border-gray-200 px-2"
          aria-label="Material"
        >
          <option value="">—</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </td>
      <td className="whitespace-nowrap pt-3 text-right">
        {dirty && (
          <Button size="sm" disabled={priceN === null || costN === null} isLoading={save.isPending} onClick={() => save.mutate({ pricePerM2: priceN!, costPerM2: costN! })}>
            Saqlash
          </Button>
        )}
        <Button size="sm" variant="ghost" title={t.isActive ? 'Buyurtma formasida ko\'rinmaydi, lekin saqlanadi' : undefined} onClick={() => save.mutate({ isActive: !t.isActive })}>{t.isActive ? 'Yashirish' : 'Yoqish'}</Button>
        <Button size="sm" variant="ghost" className="text-red-600" aria-label="O'chirish" isLoading={remove.isPending}
          onClick={() => window.confirm(`«${t.name}» turini butunlay o'chirasizmi? Eski buyurtmalar o'zgarmaydi`) && remove.mutate()}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
    <tr className={cn('border-b border-gray-100', !t.isActive && 'opacity-40')}>
      <td className="pb-3 pt-1 align-top text-xs text-gray-400">Doimiy xizmatlar:</td>
      <td colSpan={6} className="pb-3 pt-1">
        <ServiceChips services={services} value={t.serviceCodes} onChange={(serviceCodes) => save.mutate({ serviceCodes })} />
      </td>
    </tr>
    </>
  );
}

function AddTypeForm({ materials }: { materials: Material[] }) {
  const toast = useToast();
  const qc = useQueryClient();
  const blank = { name: '', unit: 'M2' as ProductPriceUnit, price: '', cost: '', materialId: '' };
  const [f, setF] = React.useState(blank);
  const create = useMutation({
    mutationFn: () => {
      const pricePerM2 = f.price.trim() ? parseMoney(f.price) : 0;
      const costPerM2 = f.cost.trim() ? parseMoney(f.cost) : 0;
      if (pricePerM2 === null || costPerM2 === null) return Promise.reject(new Error('Narxni raqam bilan kiriting'));
      return settingsApi.createProductType({ name: f.name.trim(), priceUnit: f.unit, pricePerM2, costPerM2, defaultMaterialId: f.materialId || null });
    },
    onSuccess: (t) => {
      toast.success(`"${t.name}" qo'shildi`);
      setF(blank);
      qc.invalidateQueries({ queryKey: ['product-types'] });
    },
    onError: toast.error,
  });

  return (
    <form
      className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-dashed border-gray-200 p-4 md:grid-cols-6"
      onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) create.mutate(); }}
    >
      <Input label="Nomi" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Lightbox" />
      <Select label="Narx birligi" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as ProductPriceUnit })} options={unitOptions} />
      <Input label={`${PRODUCT_UNIT_LABELS[f.unit]} narxi`} inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      <Input label={`${PRODUCT_UNIT_LABELS[f.unit]} tannarxi`} inputMode="numeric" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
      <Select
        label="Material"
        value={f.materialId}
        onChange={(e) => setF({ ...f, materialId: e.target.value })}
        placeholder="—"
        options={materials.map((m) => ({ value: m.id, label: m.name }))}
      />
      <div className="flex items-end">
        <Button type="submit" className="w-full" disabled={!f.name.trim()} isLoading={create.isPending}><Plus className="h-4 w-4" />Qo'shish</Button>
      </div>
    </form>
  );
}

export default function ProductTypesPage() {
  const { data: types, isLoading, error, refetch } = useQuery({ queryKey: ['product-types'], queryFn: settingsApi.productTypes });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: () => inventoryApi.materials() });
  const { data: prices } = useQuery({ queryKey: ['prices'], queryFn: settingsApi.prices });
  const mats = materials ?? [];
  const services = activeOfKind(prices ?? [], 'FINISHING');

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Mahsulot turlari" subtitle="Tur tanlansa narx o'zi hisoblanadi: m² bo'yicha (maydon × narx) yoki dona bo'yicha. Material va bosma shu narx ichida" />
      <Card>
        {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading || !types ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="py-2">Nomi</th><th>Birlik</th><th>Narx</th><th>Tannarx</th><th>Marja</th><th>Asosiy material</th><th />
                </tr>
              </thead>
              <tbody>
                {types.map((t) => <TypeRow key={`${t.id}-${t.pricePerM2}-${t.costPerM2}`} t={t} materials={mats} services={services} />)}
              </tbody>
            </table>
            {types.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Hali tur qo'shilmagan</p>}
          </div>
        )}
        <AddTypeForm materials={mats} />
        <p className="mt-3 text-xs text-gray-500">
          Narx 0 bo'lsa, narx asosiy materialning narxidan (Sozlamalar → Narxlar) hisoblanadi, material ham bo'lmasa — qo'lda yoziladi.
          Doimiy xizmatlar tur tanlanganda o'zi belgilanadi (masalan bannerga luvers). Narxni o'zgartirish faqat yangi buyurtmalarga ta'sir qiladi.
          {types?.some((t) => t.pricePerM2 > 0) && ` Masalan: 1,40 × 1,20 = 1,68 m² × ${formatCurrency(types.find((t) => t.pricePerM2 > 0)!.pricePerM2)}.`}
        </p>
      </Card>
    </div>
  );
}
