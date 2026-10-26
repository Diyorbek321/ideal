import React from 'react';
import { errorMessage, pricingApi, type PriceInput } from '@/api';
import type { PriceListItem, PriceResult, ProductType } from '@/types';
import { useDebounced } from '@/components/clients/ClientPicker';
import { findType, materialCodeFor } from '@/lib/pricing';
import { parseDecimal } from '@/lib/utils';
import { metersToCm } from '@/lib/size';

export interface PricedDraft {
  productType: string;
  materialId: string;
  width: string;
  height: string;
  quantity: string;
  services: string[];
  /** true — narx qo'lda yozilgan (yoki tahrirdagi/kalkulyatordagi narx), qayta hisoblanmaydi */
  manual: boolean;
}

interface Options {
  types: ProductType[] | undefined;
  prices: PriceListItem[] | undefined;
  needsDesign: boolean;
  /** Montaj narxi — buyurtmaga bir marta, birinchi avtomatik narxlanadigan mahsulotga qo'shiladi */
  installationCode: string;
}

/** Avtomatik hisoblab bo'ladigan mahsulot uchun kalkulyator so'rovi; aks holda null */
export function priceInputFor(it: PricedDraft, withInstallation: boolean, o: Options): PriceInput | null {
  const type = findType(o.types, it.productType);
  const priced = (type?.pricePerM2 ?? 0) > 0;
  const materialCode = o.prices ? materialCodeFor(o.prices, it.materialId || type?.defaultMaterialId) : undefined;
  const w = metersToCm(it.width), h = metersToCm(it.height), q = parseDecimal(it.quantity) ?? 0;
  if ((!priced && !materialCode) || w === null || h === null || !(Number.isInteger(q) && q >= 1)) return null;
  return {
    productTypeId: type?.id,
    ...(!priced && { materialCode }),
    widthCm: w, heightCm: h, quantity: q,
    finishingCodes: it.services,
    needsDesign: o.needsDesign,
    installationCode: withInstallation && o.installationCode ? o.installationCode : undefined,
    urgent: false,
  };
}

export type ItemPrice = PriceResult | string | null;

/** Montaj narxi qo'shiladigan qator: birinchi avtomatik narxlanadigan mahsulot (-1 — yo'q) */
export function installationIndex(items: PricedDraft[], o: Options): number {
  return items.findIndex((it) => !it.manual && priceInputFor(it, false, o) !== null);
}

/**
 * Har bir mahsulot narxini backend kalkulyatorida hisoblaydi (qo'lda narxlilardan tashqari).
 * Natija kelgach onUnitPrice(idx, narx) chaqiriladi — forma dona narxini yangilaydi.
 */
export function useItemPricing(items: PricedDraft[], o: Options, onUnitPrice: (idx: number, unitPrice: number) => void): ItemPrice[] {
  const installAt = installationIndex(items, o);
  const inputs = items.map((it, idx) => (it.manual ? null : priceInputFor(it, idx === installAt, o)));
  const key = useDebounced(JSON.stringify(inputs), 350);
  const [results, setResults] = React.useState<Array<{ input: string; res: ItemPrice }>>([]);
  const cb = React.useRef(onUnitPrice);
  cb.current = onUnitPrice;
  // Javob kelguncha qator o'chirilgan/o'zgargan bo'lsa narx boshqa qatorga tushmasin
  const latest = React.useRef(inputs);
  latest.current = inputs;

  React.useEffect(() => {
    let cancelled = false;
    const list = JSON.parse(key) as Array<PriceInput | null>;
    Promise.all(list.map((inp) => (inp ? pricingApi.calculate(inp).catch((e: unknown) => errorMessage(e)) : Promise.resolve(null))))
      .then((r) => {
        if (cancelled) return;
        setResults(r.map((res, idx) => ({ input: JSON.stringify(list[idx]), res })));
        r.forEach((res, idx) => {
          const still = JSON.stringify(latest.current[idx] ?? null) === JSON.stringify(list[idx]);
          if (res && typeof res !== 'string' && still) cb.current(idx, res.unitPrice);
        });
      });
    return () => { cancelled = true; };
  }, [key]);

  // Faqat joriy ma'lumotga mos natijalar (eskirgani ko'rsatilmaydi)
  return inputs.map((inp, idx) => (results[idx]?.input === JSON.stringify(inp ?? null) ? results[idx]!.res : null));
}
