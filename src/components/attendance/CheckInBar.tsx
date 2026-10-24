import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Fingerprint, LogOut, MapPin } from 'lucide-react';
import React from 'react';
import { attendanceApi, filesApi } from '@/api';
import { useUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { SelfieCamera } from './SelfieCamera';

const hhmm = (iso: string) => formatDateTime(iso).slice(-5);

function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Qurilmada joylashuv (GPS) yo\'q'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Joylashuvga ruxsat bering — check-in faqat ofisda qilinadi')),
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
  const checkOut = useMutation({ mutationFn: attendanceApi.checkOut, onSuccess: () => { toast.success('Ketish vaqti belgilandi'); done(); }, onError: toast.error });

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
        <Button variant="ghost" size="sm" isLoading={checkOut.isPending} onClick={() => window.confirm('Ish kunini yakunlaysizmi?') && checkOut.mutate()}>
          <LogOut className="h-4 w-4" />Ketdim
        </Button>
      )}
    </div>
  );
}
