import type { PriceListItem, ProductType } from '@/types';
import { formatCurrency } from '@/lib/utils';

export const activeOfKind = (items: PriceListItem[], kind: PriceListItem['kind']): PriceListItem[] =>
  items.filter((i) => i.kind === kind && i.isActive);

export const PRODUCT_UNIT_LABELS: Record<ProductType['priceUnit'], string> = { M2: '1 m²', PIECE: '1 dona' };

/** "45 000 so'm / 1 m²" yoki narx yo'q bo'lsa null */
export function productPriceLabel(t: ProductType): string | null {
  return t.pricePerM2 > 0 ? `${formatCurrency(t.pricePerM2)} / ${PRODUCT_UNIT_LABELS[t.priceUnit]}` : null;
}

/** Nom bo'yicha faol turni topadi (katta-kichik harf farqi yo'q) */
export function findType(types: ProductType[] | undefined, name: string): ProductType | undefined {
  const n = name.trim().toLowerCase();
  return n ? types?.find((t) => t.isActive && t.name.toLowerCase() === n) : undefined;
}

/** Turning asosiy materialiga mos narx pozitsiyasi kodi */
export function materialCodeFor(prices: PriceListItem[], materialId: string | null | undefined): string | undefined {
  return materialId ? prices.find((p) => p.kind === 'MATERIAL' && p.isActive && p.materialId === materialId)?.code : undefined;
}
