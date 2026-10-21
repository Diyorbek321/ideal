import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 1250000 → "1 250 000 so'm"
export function formatCurrency(amount: number | null | undefined) {
  return `${formatNumber(Math.round(amount ?? 0))} so'm`;
}

// KPI kartalari uchun: 3 393 000 -> "3,39 mln"
export function formatCompact(amount: number | null | undefined) {
  const n = Math.round(amount ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${formatNumber(n / 1_000_000_000, 2).replace('.', ',')} mlrd`;
  if (abs >= 1_000_000) return `${formatNumber(n / 1_000_000, 2).replace('.', ',')} mln`;
  if (abs >= 10_000) return `${formatNumber(n / 1000)} ming`;
  return formatNumber(n);
}

// Brauzerlarda uz-UZ lokali ko'pincha yo'q — nomlar qo'lda
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export const formatLongDate = (d: Date) => `${d.getDate()}-${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;

export function formatNumber(n: number, digits = 0) {
  return n.toFixed(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return `${formatDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatHours(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} daq`;
  if (hours < 48) return `${Math.round(hours)} soat`;
  return `${Math.round(hours / 24)} kun`;
}

// "+998901234567" → "+998 90 123 45 67"
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return '—';
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

export function deadlineText(deadline: string | null) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${-days} kun kechikdi`, late: true };
  if (days === 0) return { text: 'Bugun', late: false };
  return { text: `${days} kun qoldi`, late: false };
}

export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const monthRange = (offsetMonths = 0) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
};

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const telegramShareUrl = (text: string) => `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;

// Pul: "1 250 000", "1,250,000", "1.250.000" → 1250000. Raqam bo'lmasa — null
export function parseMoney(input: string): number | null {
  const digits = input.replace(/[\s,.'’]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  return Number(digits);
}

// O'lcham/miqdor: "2,5" va "2.5" → 2.5. Raqam bo'lmasa — null
export function parseDecimal(input: string): number | null {
  const s = input.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

// Backend bergan /uploads/... manzili; API boshqa domenda bo'lsa uning manzili qo'shiladi
export function fileUrl(path: string | null | undefined): string {
  if (!path) return '';
  return path.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL ?? ''}${path}` : path;
}
