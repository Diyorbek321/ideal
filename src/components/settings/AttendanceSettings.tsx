import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { formatCurrency, parseMoney, toDateInput } from '@/lib/utils';
import { settingsApi } from '@/api';
import type { CompanySettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

/** Ish boshlanish vaqti va ofis joylashuvi (check-in faqat ofis yonida bo'lishi uchun) */
export function AttendanceSettings({ s }: { s: CompanySettings }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = React.useState({ start: '', lat: '', lng: '', radius: '', penalty: '', grace: '', from: '' });
  const [locating, setLocating] = React.useState(false);
  React.useEffect(() => {
    setF({
      start: s.workStartTime, lat: s.officeLat == null ? '' : String(s.officeLat), lng: s.officeLng == null ? '' : String(s.officeLng), radius: String(s.officeRadiusM),
      penalty: String(s.latePenalty), grace: String(s.lateGraceMin), from: s.absenceFrom ?? '',
    });
  }, [s]);

  const lat = num(f.lat);
  const lng = num(f.lng);
  const radius = Number(f.radius);
  const penalty = f.penalty.trim() ? parseMoney(f.penalty) : 0;
  const grace = Number(f.grace);
  const valid = /^\d{2}:\d{2}$/.test(f.start) && (lat == null) === (lng == null) && !Number.isNaN(lat) && !Number.isNaN(lng) && radius >= 20
    && penalty !== null && Number.isInteger(grace) && grace >= 0;

  const save = useMutation({
    mutationFn: () => settingsApi.updateCompany({
      workStartTime: f.start, officeLat: lat, officeLng: lng, officeRadiusM: Math.round(radius),
      latePenalty: penalty ?? 0, lateGraceMin: grace, absenceFrom: f.from || null,
    }),
    onSuccess: () => {
      toast.success('Saqlandi');
      for (const key of ['company', 'attendance', 'payroll', 'payroll-sheet']) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: toast.error,
  });

  const here = () => {
    if (!navigator.geolocation) return toast.error(new Error('Brauzerda joylashuv yo\'q'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((x) => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })); setLocating(false); },
      () => { toast.error(new Error('Joylashuvga ruxsat berilmadi')); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  return (
    <Card title="Davomat (check-in)" description="Xodimlar ishga kelganda «Ishga keldim» tugmasini bosadi. Kechikish shu vaqtdan hisoblanadi">
      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input label="Ish boshlanish vaqti" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
        <Input label="Ruxsat etilgan masofa (metr)" inputMode="numeric" value={f.radius} onChange={(e) => setF({ ...f, radius: e.target.value })} />
        <Input label="Ofis kengligi (lat)" inputMode="decimal" placeholder="bo'sh — joylashuv tekshirilmaydi" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
        <Input label="Ofis uzunligi (lng)" inputMode="decimal" value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
      </div>
      <div className="mt-6 border-t border-gray-100 pt-4">
        <p className="mb-3 text-sm font-semibold text-gray-900">Oylikka ta'siri</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Kelmagan kunlar qaysi sanadan ayiriladi" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <Input label="Kechikish jarimasi (so'm, har biriga)" inputMode="numeric" placeholder="0 — jarima yo'q" value={f.penalty} onChange={(e) => setF({ ...f, penalty: e.target.value })} />
          <Input label="Necha daqiqadan keyin" inputMode="numeric" value={f.grace} onChange={(e) => setF({ ...f, grace: e.target.value })} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Fiks oylikdan har kelmagan ish kuni uchun oylik ÷ oydagi ish kunlari ayiriladi; sababli kunlar (kasal, ta'til) — oylik varag'ida belgilanadi va ayirilmaydi.
          {f.from ? ` ${f.from.split('-').reverse().join('.')} dan oldingi kunlar hisobga olinmaydi.` : ' Sana bo\'sh — kelmagan kunlar hozircha ayirilmaydi.'}
          {penalty ? ` Har ${f.grace || 0} daqiqadan ortiq kechikish — ${formatCurrency(penalty)}.` : ''}
        </p>
        {!f.from && (
          <button type="button" className="mt-2 text-xs font-semibold text-brand-700 hover:underline" onClick={() => setF({ ...f, from: toDateInput(new Date()) })}>
            Bugundan boshlash
          </button>
        )}
      </div>
      <p className="mt-3 text-sm text-gray-500">
        Ofis joylashuvi kiritilsa, check-in faqat ofisdan {f.radius || '…'} m ichida qabul qilinadi. Ofisda turib «Hozirgi joylashuv» ni bosing.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" isLoading={locating} onClick={here}><MapPin className="h-4 w-4" />Hozirgi joylashuv</Button>
        {(f.lat || f.lng) && <Button variant="ghost" onClick={() => setF({ ...f, lat: '', lng: '' })}>Joylashuvni o'chirish</Button>}
        <Button disabled={!valid} isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
      </div>
    </Card>
  );
}
