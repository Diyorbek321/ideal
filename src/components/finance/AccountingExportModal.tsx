import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { excelApi } from '@/api';
import { toDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  month: string; // "2026-10" — sahifada tanlangan oy, boshlang'ich qiymat
}

const monthDays = (ym: string) => {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return { from: toDateInput(new Date(y, m - 1, 1)), to: toDateInput(new Date(y, m, 0)) };
};

const quarterOf = (ym: string) => {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const q = Math.floor((m - 1) / 3);
  return { from: toDateInput(new Date(y, q * 3, 1)), to: toDateInput(new Date(y, q * 3 + 3, 0)) };
};

const yearOf = (ym: string) => {
  const y = Number(ym.slice(0, 4));
  return { from: `${y}-01-01`, to: `${y}-12-31` };
};

// Buxgalter uchun: to'lovlar, xarajatlar, buyurtmalar, qarzdorlar va jami — bitta .xlsx
export function AccountingExportModal({ open, onClose, month }: Props) {
  const toast = useToast();
  const [range, setRange] = React.useState(() => monthDays(month));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (open) setRange(monthDays(month)); }, [open, month]);

  const valid = range.from && range.to && range.from <= range.to;

  const download = async () => {
    setBusy(true);
    try {
      await excelApi.accounting(range.from, range.to);
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buxgalter uchun Excel"
      footer={<>
        <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
        <Button onClick={download} isLoading={busy} disabled={!valid}><FileSpreadsheet className="h-4 w-4" />Yuklab olish</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setRange(monthDays(month))}>Shu oy</Button>
          <Button size="sm" variant="outline" onClick={() => setRange(quarterOf(month))}>Chorak</Button>
          <Button size="sm" variant="outline" onClick={() => setRange(yearOf(month))}>Yil</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dan" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <Input label="Gacha" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })}
            error={range.from && range.to && range.from > range.to ? 'Boshlanish sanasidan oldin' : undefined} />
        </div>
        <p className="text-sm text-gray-500">
          Faylda: <b>Jami</b> (tushum usullar bo'yicha, xarajat, sof qoldiq), <b>To'lovlar</b>, <b>Xarajatlar</b>, <b>Buyurtmalar</b> va
          bugungi holatdagi <b>Qarzdorlar</b> varaqlari.
        </p>
      </div>
    </Modal>
  );
}
