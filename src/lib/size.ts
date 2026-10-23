// O'lchamlar bazada santimetrda saqlanadi, foydalanuvchi esa metrda kiritadi va ko'radi (1,20 × 1,40 m).
import { parseDecimal } from './utils';

const trimZeros = (s: string) => s.replace(/\.?0+$/, '');

/** 120 → "1,2"; 125.5 → "1,255" — kiritish maydoni uchun */
export function cmToMeters(cm: number): string {
  return trimZeros((cm / 100).toFixed(3)).replace('.', ',');
}

/** "1,20" → 120; noto'g'ri yoki 0 bo'lsa null */
export function metersToCm(input: string): number | null {
  const m = parseDecimal(input);
  if (m === null || m <= 0) return null;
  return Math.round(m * 1000) / 10;
}

/** Bitta dona maydoni, m² (2 xona) */
export function areaFromMeters(width: string, height: string): number {
  const w = parseDecimal(width) ?? 0;
  const h = parseDecimal(height) ?? 0;
  return Math.round(w * h * 100) / 100;
}

export function formatArea(m2: number): string {
  return `${m2.toFixed(2).replace('.', ',')} m²`;
}

/** 120, 140 → "1,2 × 1,4 m" */
export function formatSize(widthCm: number, heightCm: number): string {
  return `${cmToMeters(widthCm)} × ${cmToMeters(heightCm)} m`;
}
