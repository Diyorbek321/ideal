import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Map as MapIcon, MapPin, Plus, Trash2 } from 'lucide-react';
import { settingsApi } from '@/api';
import type { CompanySettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const OfficeMapPicker = React.lazy(() => import('./OfficeMapPicker'));

const MAX_PLACES = 10;
type Row = { name: string; lat: string; lng: string; radius: string };

const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));
const toRows = (s: CompanySettings): Row[] =>
  (s.leavePlaces ?? []).map((p) => ({ name: p.name, lat: String(p.lat), lng: String(p.lng), radius: String(p.radiusM) }));

function rowValid(r: Row) {
  const lat = num(r.lat);
  const lng = num(r.lng);
  const radius = Number(r.radius);
  return r.name.trim().length > 0 && r.name.trim().length <= 60
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    && Number.isInteger(radius) && radius >= 20 && radius <= 5000;
}

/** Ofisdan tashqari «Ketdim» bosiladigan joylar: sex, ombor, filial */
export function LeavePlacesSettings({ s }: { s: CompanySettings }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [rows, setRows] = React.useState<Row[]>(() => toRows(s));
  const [mapAt, setMapAt] = React.useState<number | null>(null);
  const [locating, setLocating] = React.useState<number | null>(null);
  React.useEffect(() => setRows(toRows(s)), [s]);

  const patch = (i: number, p: Partial<Row>) => setRows((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const remove = (i: number) => {
    setRows((xs) => xs.filter((_, j) => j !== i));
    setMapAt((m) => (m === i ? null : m != null && m > i ? m - 1 : m));
  };
  const valid = rows.every(rowValid);

  const save = useMutation({
    mutationFn: () => settingsApi.updateCompany({
      leavePlaces: rows.map((r) => ({ name: r.name.trim(), lat: num(r.lat), lng: num(r.lng), radiusM: Number(r.radius) })),
    }),
    onSuccess: () => {
      toast.success('Joylar saqlandi');
      for (const key of ['company', 'attendance']) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: toast.error,
  });

  const here = (i: number) => {
    if (!navigator.geolocation) return toast.error(new Error('Brauzerda joylashuv yo\'q'));
    setLocating(i);
    navigator.geolocation.getCurrentPosition(
      (p) => { patch(i, { lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }); setLocating(null); },
      () => { toast.error(new Error('Joylashuvga ruxsat berilmadi')); setLocating(null); },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  return (
    <Card title="«Ketdim» uchun qo'shimcha joylar"
      description="Sex, ombor, filial — xodimlar ofisdan tashqari shu joylardan ham «Ketdim»ni bosa oladi. Erta ketish ofisdagidek hisoblanadi">
      {s.officeLat == null && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Ofis joylashuvi kiritilmagan — hozir «Ketdim» joylashuvsiz qabul qilinadi, bu joylar faqat hisobotda ko'rinadi
        </p>
      )}
      <div className="mt-3 space-y-4">
        {rows.length === 0 && <p className="text-sm text-gray-500">Hozircha joy qo'shilmagan</p>}
        {rows.map((r, i) => {
          const lat = num(r.lat);
          const lng = num(r.lng);
          return (
            <div key={i} className="rounded-xl border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
                <Input label="Nomi" placeholder="masalan: Sex" value={r.name} maxLength={60} onChange={(e) => patch(i, { name: e.target.value })} />
                <Input label="Kenglik (lat)" inputMode="decimal" value={r.lat} onChange={(e) => patch(i, { lat: e.target.value })} />
                <Input label="Uzunlik (lng)" inputMode="decimal" value={r.lng} onChange={(e) => patch(i, { lng: e.target.value })} />
                <Input label="Radius (metr)" inputMode="numeric" value={r.radius} onChange={(e) => patch(i, { radius: e.target.value })} />
              </div>
              {!rowValid(r) && <p className="mt-1 text-xs text-red-600">Nomi, joylashuvi va radiusi (20–5000 m) to'g'ri kiritilsin</p>}
              {mapAt === i && (
                <div className="mt-3">
                  <React.Suspense fallback={<div className="h-72 w-full animate-pulse rounded-xl bg-gray-100 sm:h-80" />}>
                    <OfficeMapPicker lat={Number.isNaN(lat) ? null : lat} lng={Number.isNaN(lng) ? null : lng} radius={Number(r.radius) || 0}
                      onChange={(la, ln) => patch(i, { lat: la.toFixed(6), lng: ln.toFixed(6) })} />
                  </React.Suspense>
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMapAt(mapAt === i ? null : i)}><MapIcon className="h-4 w-4" />{mapAt === i ? 'Xaritani yopish' : 'Xaritada'}</Button>
                <Button variant="ghost" size="sm" isLoading={locating === i} onClick={() => here(i)}><MapPin className="h-4 w-4" />Hozirgi joylashuv</Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(i)}><Trash2 className="h-4 w-4" />O'chirish</Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button variant="outline" disabled={rows.length >= MAX_PLACES}
          onClick={() => { setRows((xs) => [...xs, { name: '', lat: '', lng: '', radius: '100' }]); setMapAt(rows.length); }}>
          <Plus className="h-4 w-4" />Joy qo'shish
        </Button>
        <Button disabled={!valid} isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
      </div>
    </Card>
  );
}
