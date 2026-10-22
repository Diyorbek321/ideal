import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adScreensApi } from '@/api';
import type { AdCampaign, AdScreen, Client } from '@/types';
import { formatCurrency, parseMoney, toDateInput } from '@/lib/utils';
import { ClientPicker } from '@/components/clients/ClientPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { OccupancyStrip } from './OccupancyStrip';

interface Props {
  screens: AdScreen[];
  initialScreenId?: string;
  onClose: () => void;
  onCreated: (c: AdCampaign) => void;
}

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS) + 1;
const plusDays = (d: string, n: number) => new Date(Date.parse(d) + n * DAY_MS).toISOString().slice(0, 10);

export function CampaignFormModal({ screens, initialScreenId, onClose, onCreated }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const active = screens.filter((s) => s.isActive);
  const today = toDateInput(new Date());
  const [screenId, setScreenId] = React.useState(initialScreenId ?? active[0]?.id ?? '');
  const [client, setClient] = React.useState<Client | null>(null);
  const [title, setTitle] = React.useState('');
  const [startDate, setStart] = React.useState(today);
  const [endDate, setEnd] = React.useState(plusDays(today, 29));
  const [slots, setSlots] = React.useState('1');
  const [price, setPrice] = React.useState('');
  const [discount, setDiscount] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  const screen = active.find((s) => s.id === screenId);
  const days = startDate && endDate && endDate >= startDate ? daysBetween(startDate, endDate) : 0;
  const pricePerDay = price.trim() ? parseMoney(price) : screen?.pricePerDay ?? 0;
  const total = days * (Number(slots) || 0) * (pricePerDay ?? 0) - (parseMoney(discount) ?? 0);

  const save = useMutation({
    mutationFn: () => adScreensApi.createCampaign({
      screenId, clientId: client!.id, title: title.trim(), startDate, endDate, slots: Number(slots),
      pricePerDay: price.trim() ? parseMoney(price) ?? undefined : undefined,
      discount: parseMoney(discount) ?? 0, status: confirmed ? 'TASDIQLANDI' : 'BRON', notes: notes.trim() || null,
    }),
    onSuccess: (c) => { toast.success(`${c.number} bron qilindi`); void qc.invalidateQueries({ queryKey: ['ad-screens'] }); onCreated(c); },
    onError: toast.error,
  });

  const submit = () => {
    if (!screen) return toast.error('Ekranni tanlang');
    if (!client) return toast.error('Mijozni tanlang');
    if (title.trim().length < 2) return toast.error('Reklama nomini kiriting');
    if (!days) return toast.error('Sanalar noto\'g\'ri');
    if (total < 0) return toast.error('Chegirma summadan katta');
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} title="Yangi reklama (bron)" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Bekor</Button><Button onClick={submit} isLoading={save.isPending}>Bron qilish</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Ekran" value={screenId} onChange={(e) => setScreenId(e.target.value)}
            options={active.map((s) => ({ value: s.id, label: `${s.name} — ${s.freeNext30}/${s.maxSlots} bo'sh` }))} placeholder={active.length ? undefined : 'Faol ekran yo\'q'} />
          <ClientPicker value={client} onChange={setClient} />
          <div className="sm:col-span-2"><Input label="Reklama nomi" placeholder="Masalan: Shifo Med — ochilish aksiyasi" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Boshlanish" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
            <Input label="Tugash (shu kun ham)" type="date" value={endDate} min={startDate} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Slot (${screen?.slotSeconds ?? 15} s)`} inputMode="numeric" value={slots} onChange={(e) => setSlots(e.target.value)} />
            <Input label="Kunlik narx / slot" inputMode="numeric" placeholder={screen ? String(screen.pricePerDay) : ''} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <Input label="Chegirma, so'm" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Kelishildi — darhol tasdiqlash</label>
        </div>

        {screen && (
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">{screen.name}: bandlik</p>
            <OccupancyStrip screenId={screen.id} from={startDate || today} days={Math.min(Math.max(days, 14), 92)}
              highlight={days ? { from: startDate, to: endDate, slots: Number(slots) || 1 } : undefined} />
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3 text-sm">
          <span className="text-gray-600">{days} kun × {Number(slots) || 0} slot × {formatCurrency(pricePerDay ?? 0)}</span>
          <b className="text-base text-gray-900">{formatCurrency(Math.max(total, 0))}</b>
        </div>
        <Textarea label="Izoh" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
