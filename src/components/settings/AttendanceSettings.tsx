import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
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
  const [f, setF] = React.useState({ start: '', lat: '', lng: '', radius: '' });
  const [locating, setLocating] = React.useState(false);
  React.useEffect(() => {
    setF({ start: s.workStartTime, lat: s.officeLat == null ? '' : String(s.officeLat), lng: s.officeLng == null ? '' : String(s.officeLng), radius: String(s.officeRadiusM) });
  }, [s]);

  const lat = num(f.lat);
  const lng = num(f.lng);
  const radius = Number(f.radius);
  const valid = /^\d{2}:\d{2}$/.test(f.start) && (lat == null) === (lng == null) && !Number.isNaN(lat) && !Number.isNaN(lng) && radius >= 20;

  const save = useMutation({
    mutationFn: () => settingsApi.updateCompany({ workStartTime: f.start, officeLat: lat, officeLng: lng, officeRadiusM: Math.round(radius) }),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['company'] }); qc.invalidateQueries({ queryKey: ['attendance'] }); },
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
