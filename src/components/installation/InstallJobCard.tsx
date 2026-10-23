import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, CheckSquare, ChevronRight, MapPin, Navigation, Phone, Square } from 'lucide-react';
import { installationsApi } from '@/api';
import type { Installation, InstallProblemType } from '@/types';
import { INSTALL_STATUS_LABELS, PROBLEM_LABELS, options } from '@/lib/labels';
import { cn, fileUrl, formatDateTime, formatPhone } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileButton } from '@/components/ui/FileButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { formatSize } from '@/lib/size';

const mapLink = (i: Installation) => i.mapUrl ?? `https://yandex.uz/maps/?text=${encodeURIComponent(i.address)}`;

export function InstallJobCard({ job }: { job: Installation }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [problemOpen, setProblemOpen] = React.useState(false);
  const [pType, setPType] = React.useState<InstallProblemType>('WRONG_SIZE');
  const [pText, setPText] = React.useState('');
  const [pPhoto, setPPhoto] = React.useState<string | undefined>();
  const [confirmedBy, setConfirmedBy] = React.useState('');

  const refresh = () => invalidateOrderViews(qc);
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
    onError: toast.error,
  });
  const run = (fn: () => Promise<unknown>, msg?: string) =>
    act.mutate(fn, { onSuccess: () => msg && toast.success(msg) });

  const report = useMutation({
    mutationFn: () => installationsApi.problem(job.id, { type: pType, description: pText.trim(), photoUrl: pPhoto }),
    onSuccess: () => { toast.success('Muammo yozildi, menejerga ko\'rinadi'); setProblemOpen(false); setPText(''); setPPhoto(undefined); refresh(); },
    onError: toast.error,
  });

  const allChecked = job.checklist.every((c) => c.done);
  const phones = [job.contactPhone, ...(job.order?.client.phones ?? [])].filter(Boolean) as string[];
  const preview = job.order?.designVersions[0]?.previewUrl;
  const unresolved = job.problems.filter((p) => !p.resolved);

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className={cn('p-4 text-white', job.status === 'PROBLEM' ? 'bg-red-600' : job.status === 'DONE' ? 'bg-emerald-600' : 'bg-gray-900')}>
        <div className="mb-2 flex items-start justify-between">
          <span className="text-xs font-black uppercase tracking-widest opacity-80">{job.order?.number}</span>
          <Badge className="border-0 bg-white/20 text-[10px] text-white">{INSTALL_STATUS_LABELS[job.status]}</Badge>
        </div>
        <h3 className="text-lg font-bold">{job.order?.client.name}</h3>
        <p className="text-sm opacity-80">{formatDateTime(job.scheduledAt)}</p>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-3">
          <div className="flex items-start text-sm text-gray-600">
            <MapPin className="mr-3 mt-1 h-4 w-4 shrink-0 text-brand-600" />
            <p className="font-medium leading-relaxed">{job.address}</p>
          </div>
          {phones.map((p) => (
            <a key={p} href={`tel:${p}`} className="flex items-center text-sm text-gray-600">
              <Phone className="mr-3 h-4 w-4 shrink-0 text-emerald-500" /><span className="font-bold">{formatPhone(p)}</span>
            </a>
          ))}
        </div>

        <div className="rounded-xl bg-gray-50 p-3 text-sm">
          {job.order?.items.map((it, i) => (
            <p key={i} className="font-medium text-gray-900">{it.productType}: {formatSize(it.widthCm, it.heightCm)} × {it.quantity}</p>
          ))}
          {job.sizesNote && <p className="mt-1 text-gray-600">O'lcham: {job.sizesNote}</p>}
          {job.mountingType && <p className="text-gray-600">Mahkamlash: {job.mountingType}</p>}
          {job.requiredItems.length > 0 && <p className="text-gray-600">Olish kerak: {job.requiredItems.join(', ')}</p>}
          {preview && <a href={fileUrl(preview)} target="_blank" rel="noreferrer"><img src={fileUrl(preview)} alt="Dizayn" className="mt-2 max-h-40 rounded-lg" /></a>}
        </div>

        <a href={mapLink(job)} target="_blank" rel="noreferrer" className="block">
          <Button variant="outline" className="h-12 w-full border-gray-200 bg-gray-50"><Navigation className="h-4 w-4 text-brand-600" />Xaritada ochish</Button>
        </a>

        {job.status === 'PLANNED' && (
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Chiqishdan oldin tekshiring</p>
            <div className="space-y-2">
              {job.checklist.map((c) => (
                <button
                  key={c.key}
                  disabled={act.isPending}
                  onClick={() => run(() => installationsApi.checklist(job.id, c.key, !c.done))}
                  className="flex w-full items-center space-x-3 py-1 text-left text-sm text-gray-700"
                >
                  {c.done ? <CheckSquare className="h-6 w-6 text-brand-600" /> : <Square className="h-6 w-6 text-gray-300" />}
                  <span className={c.done ? 'text-gray-400 line-through' : ''}>{c.label}</span>
                </button>
              ))}
            </div>
            <Button className="mt-4 h-12 w-full" disabled={!allChecked} isLoading={act.isPending} onClick={() => run(() => installationsApi.depart(job.id), 'Yo\'lga chiqdingiz')}>
              Yo'lga chiqdim <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {(job.status === 'ON_THE_WAY' || job.status === 'IN_PROGRESS' || job.status === 'PROBLEM') && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <FileButton variant="outline" className="h-12" accept="image/*" capture kind="PHOTO" orderId={job.orderId}
                onUploaded={(f) => run(() => installationsApi.photos(job.id, 'before', [f.url]), '"Oldin" rasmi qo\'shildi')}>
                <Camera className="mr-1 h-4 w-4" />Oldin ({job.beforePhotos.length})
              </FileButton>
              <FileButton variant="outline" className="h-12" accept="image/*" capture kind="PHOTO" orderId={job.orderId}
                onUploaded={(f) => run(() => installationsApi.photos(job.id, 'after', [f.url]), '"Keyin" rasmi qo\'shildi')}>
                <Camera className="mr-1 h-4 w-4" />Keyin ({job.afterPhotos.length})
              </FileButton>
            </div>
            {job.status !== 'IN_PROGRESS' && (
              <Button className="h-12 w-full" isLoading={act.isPending} onClick={() => run(() => installationsApi.start(job.id), 'O\'rnatish boshlandi')}>
                {job.status === 'PROBLEM' ? 'Ishni davom ettirish' : 'Boshladim'} <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {job.status !== 'ON_THE_WAY' && (
              <>
                <Input label="Qabul qilgan shaxs (ixtiyoriy)" value={confirmedBy} onChange={(e) => setConfirmedBy(e.target.value)} />
                <Button
                  className="h-12 w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={job.afterPhotos.length === 0 || unresolved.length > 0}
                  isLoading={act.isPending}
                  onClick={() => run(() => installationsApi.finish(job.id, confirmedBy.trim() || undefined), 'Ish yakunlandi!')}
                >
                  Tugatdim
                </Button>
                {job.afterPhotos.length === 0 && <p className="text-center text-xs text-gray-500">Tugatish uchun "keyin" rasmini yuklang</p>}
                {unresolved.length > 0 && <p className="text-center text-xs text-red-600">Hal qilinmagan muammo bor — menejer yopishi kerak</p>}
              </>
            )}
          </div>
        )}

        {job.problems.map((p) => (
          <div key={p.id} className={cn('rounded-lg p-3 text-xs', p.resolved ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-800')}>
            <b>{PROBLEM_LABELS[p.type]}:</b> {p.description} {p.resolved && '(hal qilindi)'}
          </div>
        ))}

        {job.status !== 'DONE' && (
          <Button variant="ghost" className="w-full py-2 text-xs font-bold text-red-600" onClick={() => setProblemOpen(true)}>
            <AlertTriangle className="h-3 w-3" />Muammo haqida xabar berish
          </Button>
        )}
      </div>

      <Modal
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        title="Muammo"
        footer={(
          <>
            <Button variant="outline" onClick={() => setProblemOpen(false)}>Bekor qilish</Button>
            <Button variant="danger" disabled={pText.trim().length < 3} isLoading={report.isPending} onClick={() => report.mutate()}>Yuborish</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Select label="Turi" value={pType} onChange={(e) => setPType(e.target.value as InstallProblemType)} options={options(PROBLEM_LABELS)} />
          <Textarea label="Nima bo'ldi?" value={pText} onChange={(e) => setPText(e.target.value)} rows={3} />
          <FileButton variant="outline" size="sm" accept="image/*" capture kind="PHOTO" orderId={job.orderId} onUploaded={(f) => setPPhoto(f.url)}>
            <Camera className="mr-1 h-4 w-4" />{pPhoto ? 'Rasm qo\'shildi ✓' : 'Rasm qo\'shish'}
          </FileButton>
        </div>
      </Modal>
    </Card>
  );
}
