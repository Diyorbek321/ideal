import { formatCurrency } from './utils';

/** Shundan katta summa odatda adashib kiritilgan bo'ladi (masalan, butun partiya narxi dona narxi o'rniga) */
export const BIG_AMOUNT = 50_000_000;

/** Katta summada saqlashdan oldin tasdiq so'raydi. Kichik summada darhol true */
export function confirmBigAmount(amount: number, what: string, detail?: string): boolean {
  if (amount < BIG_AMOUNT) return true;
  return window.confirm(
    `${what}: ${formatCurrency(amount)}. Summa juda katta — to'g'rimi?${detail ? `\n\n${detail}` : ''}\n\nTekshirish uchun «Bekor» ni bosing.`,
  );
}
