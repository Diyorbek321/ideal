import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Clock, Fingerprint, LogOut, MapPin } from 'lucide-react';
import React from 'react';
import { attendanceApi, filesApi } from '@/api';
import { useUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { SelfieCamera } from './SelfieCamera';

const hhmm = (iso: string) => formatDateTime(iso).slice(-5);

function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Qurilmada joylashuv (GPS) yo\'q'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Joylashuvga ruxsat bering — belgilash faqat ofisda qilinadi')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

/** Har bir xodim ishga kelganda "Ishga keldim" ni bosadi (direktordan tashqari) */
export function CheckInBar() {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const enabled = user.role !== 'ADMIN';
  const { data } = useQuery({ queryKey: ['attendance', 'today'], queryFn: attendanceApi.today, enabled, staleTime: 60_000 });

  const [camera, setCamera] = React.useState(false);

  const done = () => qc.invalidateQueries({ queryKey: ['attendance'] });
  const checkIn = useMutation({
    // Avval GPS (rad etilsa — selfi behuda yuklanmaydi), keyin selfi
    mutationFn: async (selfie?: File) => {
      const coords = data?.geofence ? await currentPosition() : {};
      const selfieUrl = selfie ? (await filesApi.upload(selfie, { kind: 'PHOTO' })).url : undefined;
      return attendanceApi.checkIn({ ...coords, selfieUrl });
    },
    onSuccess: (r) => { setCamera(false); toast.success(r.lateMinutes ? `Belgilandi. ${r.lateMinutes} daqiqa kechikdingiz` : 'Belgilandi. Xayrli ish kuni!'); done(); },
    onError: toast.error,
  });
  const checkOut = useMutation({
    mutationFn: async () => attendanceApi.checkOut(data?.geofence ? await currentPosition() : {}),
    onSuccess: (r) => { toast.success(r.earlyLeaveMinutes ? `Belgilandi. Ish tugashidan ${r.earlyLeaveMinutes} daqiqa oldin` : 'Ketish vaqti belgilandi'); done(); },
    onError: toast.error,
  });
  const [ot, setOt] = React.useState<{ until: string; reason: string } | null>(null);
  const overtime = useMutation({
    mutationFn: attendanceApi.requestOvertime,
    onSuccess: () => { setOt(null); toast.success('So\'rov yuborildi — rahbar tasdiqlashi kerak'); done(); },
    onError: toast.error,
  });

  if (!enabled || !data) return null;
  const r = data.record;

  if (!r) {
    return (
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-brand-300 bg-brand-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Fingerprint className="h-6 w-6 shrink-0 text-gray-900" />
          <div>
            <p className="font-semibold text-gray-900">Ishga kelganingizni tasdiqlang</p>
            <p className="text-sm text-gray-700">Ish {data.workStartTime} da boshlanadi{data.geofence && <> · <MapPin className="inline h-3.5 w-3.5" /> faqat ofisda</>}{data.selfieRequired && <> · bugun selfi bilan</>}</p>
          </div>
        </div>
        <Button variant="secondary" size="lg" isLoading={checkIn.isPending && !camera}
          onClick={() => (data.selfieRequired ? setCamera(true) : checkIn.mutate(undefined))}>
          {data.selfieRequired && <Camera className="h-4 w-4" />}Ishga keldim
        </Button>
        <SelfieCamera open={camera} onClose={() => setCamera(false)} isLoading={checkIn.isPending} onCapture={(f) => checkIn.mutate(f)} />
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Keldingiz: <b className="text-gray-900">{hhmm(r.checkInAt)}</b>
        {r.lateMinutes > 0 && <span className="font-medium text-red-600">({r.lateMinutes} daq kechikish)</span>}
        {r.checkOutAt && <> · Ketdingiz: <b className="text-gray-900">{hhmm(r.checkOutAt)}</b></>}
      </span>
      {!r.checkOutAt && (
        <span className="flex flex-wrap items-center gap-1">
          {r.overtimeStatus === 'PENDING' && <span className="text-xs text-amber-700">Qo'shimcha ish: tasdiq kutilmoqda</span>}
          {r.overtimeStatus === 'APPROVED' && r.overtimeUntil && <span className="text-xs text-emerald-700">Qo'shimcha ish {hhmm(r.overtimeUntil)} gacha tasdiqlangan</span>}
          {r.overtimeStatus === 'REJECTED' && <span className="text-xs text-red-600">Qo'shimcha ish rad etildi</span>}
          {r.overtimeStatus !== 'APPROVED' && (
            <Button variant="ghost" size="sm" onClick={() => setOt({ until: '20:00', reason: '' })}><Clock className="h-4 w-4" />Qolib ishlayman</Button>
          )}
          <Button variant="ghost" size="sm" isLoading={checkOut.isPending}
            onClick={() => window.confirm(`Ish kunini yakunlaysizmi?${data.geofence ? ' (faqat ofisda)' : ''}`) && checkOut.mutate()}>
            <LogOut className="h-4 w-4" />Ketdim
          </Button>
        </span>
      )}
      <Modal open={!!ot} onClose={() => setOt(null)} title="Qo'shimcha ish so'rovi"
        footer={<Button disabled={!ot || ot.reason.trim().length < 3} isLoading={overtime.isPending} onClick={() => ot && overtime.mutate(ot)}>Yuborish</Button>}>
        {ot && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Ish {data.workEndTime} da tugaydi. Undan keyingi vaqt faqat rahbar tasdiqlasa hisoblanadi.
              Tunda qolsangiz — ertangi vaqtni yozing (masalan 02:00).
            </p>
            <Input label="Qachongacha" type="time" value={ot.until} onChange={(e) => setOt({ ...ot, until: e.target.value })} />
            <Textarea label="Sababi" placeholder="Masalan: ID-1234 buyurtmasi ertaga topshiriladi" value={ot.reason} onChange={(e) => setOt({ ...ot, reason: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
