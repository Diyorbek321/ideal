import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Trash2 } from 'lucide-react';
import { formatCurrency, parseMoney, toDateInput } from '@/lib/utils';
import { settingsApi } from '@/api';
import type { CompanySettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const OfficeMapPicker = React.lazy(() => import('./OfficeMapPicker'));

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

/** Ish boshlanish vaqti va ofis joylashuvi (check-in faqat ofis yonida bo'lishi uchun) */
export function AttendanceSettings({ s }: { s: CompanySettings }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = React.useState({ start: '', end: '', close: '', overtime: '', lat: '', lng: '', radius: '', penalty: '', grace: '', from: '', selfie: '', unmarked: '', siteRadius: '', siteAfter: '' });
  const [locating, setLocating] = React.useState(false);
  React.useEffect(() => {
    setF({
      start: s.workStartTime, end: s.workEndTime, close: s.autoCloseTime, overtime: String(s.overtimePercent), lat: s.officeLat == null ? '' : String(s.officeLat), lng: s.officeLng == null ? '' : String(s.officeLng), radius: String(s.officeRadiusM),
      penalty: String(s.latePenalty), grace: String(s.lateGraceMin), from: s.absenceFrom ?? '', selfie: String(s.selfiePercent),
      unmarked: String(s.unmarkedPenalty), siteRadius: String(s.siteRadiusM), siteAfter: s.siteLeaveAfter,
    });
  }, [s]);

  const lat = num(f.lat);
  const lng = num(f.lng);
  const radius = Number(f.radius);
  const penalty = f.penalty.trim() ? parseMoney(f.penalty) : 0;
  const grace = Number(f.grace);
  const selfie = f.selfie.trim() === '' ? 0 : Number(f.selfie);
  const overtime = f.overtime.trim() === '' ? 0 : Number(f.overtime);
  const unmarked = f.unmarked.trim() ? parseMoney(f.unmarked) : 0;
  const siteRadius = Number(f.siteRadius);
  const valid = /^\d{2}:\d{2}$/.test(f.start) && /^\d{2}:\d{2}$/.test(f.end) && /^\d{2}:\d{2}$/.test(f.close) && f.start < f.end && f.end < f.close && (lat == null) === (lng == null) && !Number.isNaN(lat) && !Number.isNaN(lng) && radius >= 20
    && penalty !== null && Number.isInteger(grace) && grace >= 0
    && Number.isInteger(selfie) && selfie >= 0 && selfie <= 100
    && Number.isInteger(overtime) && overtime >= 0 && overtime <= 500
    && unmarked !== null && Number.isInteger(siteRadius) && siteRadius >= 10 && siteRadius <= 2000 && /^\d{2}:\d{2}$/.test(f.siteAfter);

  const save = useMutation({
    mutationFn: (clearOffice: boolean = false) => settingsApi.updateCompany({
      workStartTime: f.start, workEndTime: f.end, autoCloseTime: f.close, overtimePercent: overtime,
      officeLat: clearOffice ? null : lat, officeLng: clearOffice ? null : lng, officeRadiusM: Math.round(radius),
      latePenalty: penalty ?? 0, lateGraceMin: grace, absenceFrom: f.from || null, selfiePercent: selfie,
      unmarkedPenalty: unmarked ?? 0, siteRadiusM: siteRadius, siteLeaveAfter: f.siteAfter,
    }),
    onSuccess: (_r, clearOffice) => {
      if (clearOffice) setF((x) => ({ ...x, lat: '', lng: '' }));
      toast.success(clearOffice ? 'Ofis joylashuvi o\'chirildi — belgilash endi joylashuvsiz' : 'Saqlandi');
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
        <Input label="Ish tugash vaqti" type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        <div>
          <Input label="«Ketdim» bosilmasa — kun yopiladi" type="time" value={f.close} onChange={(e) => setF({ ...f, close: e.target.value })} />
          <p className="mt-1 text-xs text-gray-500">Vaqt ish tugashiga qo'yiladi, direktorga Telegram xabar boradi. Tasdiqlangan qo'shimcha ish bo'lsa — o'sha muddatgacha kutiladi</p>
        </div>
        <Input label="Ruxsat etilgan masofa (metr)" inputMode="numeric" value={f.radius} onChange={(e) => setF({ ...f, radius: e.target.value })} />
        <div className="md:col-span-2">
          <p className="mb-1 text-sm font-medium text-gray-700">Ofis joylashuvi — xaritada ofisni bosing yoki belgini sudrang</p>
          <React.Suspense fallback={<div className="h-72 w-full animate-pulse rounded-xl bg-gray-100 sm:h-80" />}>
            <OfficeMapPicker lat={lat} lng={lng} radius={radius}
              onChange={(la, ln) => setF((x) => ({ ...x, lat: la.toFixed(6), lng: ln.toFixed(6) }))} />
          </React.Suspense>
          <p className="mt-1 text-xs text-gray-500">Doira — «Ishga keldim» va «Ketdim» qabul qilinadigan masofa</p>
        </div>
        <Input label="Ofis kengligi (lat)" inputMode="decimal" placeholder="bo'sh — joylashuv tekshirilmaydi" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
        <Input label="Ofis uzunligi (lng)" inputMode="decimal" value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
        <div>
          <Input label="Selfi so'rash (%)" inputMode="numeric" placeholder="0 — so'ralmaydi" value={f.selfie} onChange={(e) => setF({ ...f, selfie: e.target.value })} />
          <p className="mt-1 text-xs text-gray-500">
            {!selfie ? 'Selfi so\'ralmaydi' : selfie >= 100 ? 'Har kuni selfi so\'raladi' : `Tasodifiy kunlarda — taxminan har ${Math.max(1, Math.round(100 / selfie))}-kunda. Xodim qaysi kun ekanini oldindan bilmaydi`}
          </p>
        </div>
      </div>
      <div className="mt-6 border-t border-gray-100 pt-4">
        <p className="mb-1 text-sm font-semibold text-gray-900">O'rnatishchilar: obyektdan uyga ketish</p>
        <p className="mb-3 text-xs text-gray-500">
          O'rnatishni tugatgan jamoa «Ketdim»ni ofisga qaytmasdan, o'sha obyektda bosa oladi («Tugatdim» bosilgan joydan shu masofa ichida). Uydan bosib bo'lmaydi
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Input label="Obyekt radiusi (metr)" inputMode="numeric" value={f.siteRadius} onChange={(e) => setF({ ...f, siteRadius: e.target.value })} />
            {siteRadius > 0 && siteRadius < 50 && <p className="mt-1 text-xs text-amber-700">Telefon GPS'i 10–30 m adashishi mumkin — xodim obyektda turib ham rad javobini olsa, radiusni oshiring</p>}
          </div>
          <div>
            <Input label="Shu vaqtdan keyin — erta ketish yozilmaydi" type="time" value={f.siteAfter} onChange={(e) => setF({ ...f, siteAfter: e.target.value })} />
            <p className="mt-1 text-xs text-gray-500">Undan oldin tugatsa — ofisga qaytadi, aks holda ish tugashigacha erta ketish yoziladi</p>
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-gray-100 pt-4">
        <p className="mb-3 text-sm font-semibold text-gray-900">Oylikka ta'siri</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Kelmagan kunlar qaysi sanadan ayiriladi" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <Input label="Kechikish jarimasi (so'm, har biriga)" money inputMode="numeric" placeholder="0 — jarima yo'q" value={f.penalty} onChange={(e) => setF({ ...f, penalty: e.target.value })} />
          <Input label="Necha daqiqadan keyin" inputMode="numeric" value={f.grace} onChange={(e) => setF({ ...f, grace: e.target.value })} />
          <div>
            <Input label="«Ketdim» bosilmagan kun jarimasi (so'm)" money inputMode="numeric" placeholder="0 — jarima yo'q" value={f.unmarked} onChange={(e) => setF({ ...f, unmarked: e.target.value })} />
            <p className="mt-1 text-xs text-gray-500">Ish tugashida va 30 daqiqadan keyin eslatiladi (Telegram ulangan bo'lsa). Shundan keyin ham bosilmay tizim yopgan kun uchun</p>
          </div>
          <div>
            <Input label="Qo'shimcha ish haqi (%)" inputMode="numeric" placeholder="0 — to'lanmaydi" value={f.overtime} onChange={(e) => setF({ ...f, overtime: e.target.value })} />
            <p className="mt-1 text-xs text-gray-500">
              {overtime ? `Tasdiqlangan qo'shimcha soat — soatbay stavkaning ${overtime}% i (${(overtime / 100).toLocaleString('ru-RU')} baravar). Faqat fiks oylikdagilarga` : 'Qo\'shimcha ish to\'lanmaydi, faqat hisobotda'}
            </p>
          </div>
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
        Ofis joylashuvi kiritilsa, «Ishga keldim» va «Ketdim» faqat ofisdan {f.radius || '…'} m ichida qabul qilinadi. Nuqtani xaritadan tanlang yoki ofisda turib «Hozirgi joylashuv» ni bosing.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" isLoading={locating} onClick={here}><MapPin className="h-4 w-4" />Hozirgi joylashuv</Button>
        {s.officeLat != null && (
          <Button variant="ghost" className="text-red-600" disabled={!valid} isLoading={save.isPending && save.variables === true}
            onClick={() => window.confirm('Ofis joylashuvini o\'chirasizmi? «Ishga keldim» va «Ketdim» joylashuv tekshirilmasdan qabul qilinadi') && save.mutate(true)}>
            <Trash2 className="h-4 w-4" />Joylashuvni o'chirish
          </Button>
        )}
        <Button disabled={!valid} isLoading={save.isPending && save.variables !== true} onClick={() => save.mutate(false)}>Saqlash</Button>
      </div>
    </Card>
  );
}
