import React from 'react';
import { FileDown } from 'lucide-react';
import { exportElementToPdf } from '@/lib/pdf';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** "2026-10" → "Oktabr 2026" */
export function periodLabel(period: string) {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const name = MONTHS[m - 1] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

/** "2026-10" → "Okt" (grafik o'qi uchun) */
export const periodShort = (period: string) => {
  const m = Number(period.slice(5, 7));
  const name = MONTHS[m - 1] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1, 3)}`;
};

export function MonthInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
      aria-label="Oy"
    />
  );
}

/** PDF qilinadigan bo'lak uchun ref va tugma */
export function usePdfExport(fileName: string) {
  const ref = React.useRef<HTMLDivElement>(null);
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const run = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      await exportElementToPdf(ref.current, fileName);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const button = (
    <Button variant="outline" isLoading={busy} onClick={run} data-pdf-hide>
      <FileDown className="h-4 w-4" />PDF yuklab olish
    </Button>
  );
  return { ref, button };
}
