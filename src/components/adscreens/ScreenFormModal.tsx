import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { adScreensApi, type AdScreenInput } from '@/api';
import type { AdScreen } from '@/types';
import { fileUrl, formatCurrency, parseDecimal, parseMoney } from '@/lib/utils';
import { useUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { FileButton } from '@/components/ui/FileButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

interface Props {
  screen: AdScreen | null;
  onClose: () => void;
}

const str = (v: number | null | undefined) => (v == null ? '' : String(v));

export function ScreenFormModal({ screen, onClose }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = React.useState({
    name: screen?.name ?? '',
    address: screen?.address ?? '',
    widthM: str(screen?.widthM),
    heightM: str(screen?.heightM),
    resolution: screen?.resolution ?? '',
    slotSeconds: str(screen?.slotSeconds ?? 15),
    maxSlots: str(screen?.maxSlots ?? 20),
    workFrom: screen?.workFrom ?? '07:00',
    workTo: screen?.workTo ?? '23:00',
    pricePerDay: str(screen?.pricePerDay),
    lat: str(screen?.lat),
    lng: str(screen?.lng),
    notes: screen?.notes ?? '',
  });
  const [photoUrl, setPhotoUrl] = React.useState(screen?.photoUrl ?? null);
  const [isActive, setActive] = React.useState(screen?.isActive ?? true);
  const [showOnWebsite, setShow] = React.useState(screen?.showOnWebsite ?? true);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const body = (): AdScreenInput | string => {
    const widthM = parseDecimal(f.widthM);
    const heightM = parseDecimal(f.heightM);
    const pricePerDay = parseMoney(f.pricePerDay);
    const maxSlots = Number(f.maxSlots);
    const slotSeconds = Number(f.slotSeconds);
    if (f.name.trim().length < 2 || f.address.trim().length < 3) return 'Nom va manzilni kiriting';
    if (!widthM || !heightM) return 'Ekran o\'lchamini kiriting';
    if (pricePerDay == null) return 'Kunlik narxni kiriting';
    if (!Number.isInteger(maxSlots) || maxSlots < 1 || !Number.isInteger(slotSeconds) || slotSeconds < 5) return 'Slot sozlamalari noto\'g\'ri';
    const coord = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null);
    return {
      name: f.name.trim(), address: f.address.trim(), widthM, heightM, resolution: f.resolution.trim() || null,
      slotSeconds, maxSlots, workFrom: f.workFrom, workTo: f.workTo, pricePerDay,
      lat: coord(f.lat), lng: coord(f.lng), photoUrl, isActive, showOnWebsite, notes: f.notes.trim() || null,
    };
  };

  const save = useMutation({
    mutationFn: (b: AdScreenInput) => (screen ? adScreensApi.update(screen.id, b) : adScreensApi.create(b)),
    onSuccess: () => { toast.success('Ekran saqlandi'); void qc.invalidateQueries({ queryKey: ['ad-screens'] }); onClose(); },
    onError: toast.error,
  });

  const isAdmin = useUser().role === 'ADMIN';
  // Reklama tarixi bo'lsa server rad etadi — "faol emas" qilish taklif qilinadi
  const remove = useMutation({
    mutationFn: () => adScreensApi.remove(screen!.id),
    onSuccess: () => { toast.success('Ekran o\'chirildi'); void qc.invalidateQueries({ queryKey: ['ad-screens'] }); onClose(); },
    onError: toast.error,
  });

  const submit = () => {
    const b = body();
    if (typeof b === 'string') toast.error(b); else save.mutate(b);
  };

  const loop = Number(f.maxSlots) * Number(f.slotSeconds);

  return (
    <Modal open onClose={onClose} title={screen ? 'Ekranni tahrirlash' : 'Yangi LED ekran'} size="lg"
      footer={(
        <>
          {screen && isAdmin && (
            <Button variant="ghost" className="text-red-600 sm:mr-auto" isLoading={remove.isPending}
              onClick={() => window.confirm(`«${screen.name}» ekranini o'chirasizmi?`) && remove.mutate()}>
              <Trash2 className="h-4 w-4" />O'chirish
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button onClick={submit} isLoading={save.isPending}>Saqlash</Button>
        </>
      )}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nomi" placeholder="Markaziy chorraha" value={f.name} onChange={set('name')} />
        <Input label="Manzil" placeholder="Angren, Navoiy ko'chasi 12" value={f.address} onChange={set('address')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Eni, m" inputMode="decimal" value={f.widthM} onChange={set('widthM')} />
          <Input label="Bo'yi, m" inputMode="decimal" value={f.heightM} onChange={set('heightM')} />
        </div>
        <Input label="Ruxsat (piksel)" placeholder="1920x1080" value={f.resolution} onChange={set('resolution')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Rolik, soniya" inputMode="numeric" value={f.slotSeconds} onChange={set('slotSeconds')} />
          <Input label="Slotlar soni" inputMode="numeric" value={f.maxSlots} onChange={set('maxSlots')} />
        </div>
        <Input label="1 slot kunlik narxi, so'm" inputMode="numeric" value={f.pricePerDay} onChange={set('pricePerDay')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ishlash boshi" type="time" value={f.workFrom} onChange={set('workFrom')} />
          <Input label="Ishlash oxiri" type="time" value={f.workTo} onChange={set('workTo')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Kenglik (lat)" inputMode="decimal" placeholder="41.0167" value={f.lat} onChange={set('lat')} />
          <Input label="Uzunlik (lng)" inputMode="decimal" placeholder="70.1436" value={f.lng} onChange={set('lng')} />
        </div>
        {loop > 0 && (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 sm:col-span-2">
            Bir sikl: {f.maxSlots} ta reklama × {f.slotSeconds} s = <b>{Math.round(loop / 60 * 10) / 10} daqiqa</b>.
            {parseMoney(f.pricePerDay) ? <> Ekran to'liq band bo'lsa oyiga ≈ <b>{formatCurrency(Number(f.maxSlots) * (parseMoney(f.pricePerDay) ?? 0) * 30)}</b>.</> : null}
          </p>
        )}
        <div className="flex items-center gap-3 sm:col-span-2">
          {photoUrl && <img src={fileUrl(photoUrl)} alt="" className="h-16 w-24 rounded-lg object-cover" />}
          <FileButton variant="outline" size="sm" accept="image/*" kind="PHOTO" onUploaded={(file) => setPhotoUrl(file.url)}>
            {photoUrl ? 'Rasmni almashtirish' : 'Ekran rasmi'}
          </FileButton>
          {photoUrl && <Button variant="ghost" size="sm" onClick={() => setPhotoUrl(null)}>Olib tashlash</Button>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setActive(e.target.checked)} />Faol (bron qabul qiladi)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showOnWebsite} onChange={(e) => setShow(e.target.checked)} />Saytda ko'rsatish</label>
        <div className="sm:col-span-2"><Textarea label="Izoh (ichki)" value={f.notes} onChange={set('notes')} /></div>
      </div>
    </Modal>
  );
}
