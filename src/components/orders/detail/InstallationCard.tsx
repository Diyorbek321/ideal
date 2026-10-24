import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, MapPin } from 'lucide-react';
import { ApiError, installationsApi, usersApi } from '@/api';
import type { OrderDetail } from '@/types';
import { INSTALL_STATUS_LABELS, PROBLEM_LABELS } from '@/lib/labels';
import { isFinance, useUser } from '@/lib/auth';
import { fileUrl, formatDateTime, toDateInput } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

const pad = (n: number) => String(n).padStart(2, '0');

export function InstallationCard({ order }: { order: OrderDetail }) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  // Mahsulot tayyor bo'lganda o'rnatish o'zi yaratiladi — bor bo'lsa uni tahrirlaymiz
  const current = order.installations.find((i) => i.status !== 'DONE' && i.status !== 'CANCELLED');
  const at = current?.scheduledAt ? new Date(current.scheduledAt) : null;
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(at ? toDateInput(at) : '');
  const [time, setTime] = React.useState(at ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : '10:00');
  const [team, setTeam] = React.useState<string[]>(current?.team.map((t) => t.id) ?? []);
  const [address, setAddress] = React.useState(current?.address ?? order.installationAddress ?? '');
  const [mapUrl, setMapUrl] = React.useState(current?.mapUrl ?? '');
  const [contactPhone, setContactPhone] = React.useState(current?.contactPhone ?? '');
  const [mountingType, setMountingType] = React.useState(current?.mountingType ?? '');
  const [sizesNote, setSizesNote] = React.useState(current?.sizesNote ?? '');
  const [requiredItems, setRequiredItems] = React.useState(current?.requiredItems.join(', ') ?? '');

  // Har ochilishda joriy holatdan to'ldiramiz — oradan ustanovkachilar qo'shilgan bo'lishi mumkin
  const openEditor = () => {
    setDate(at ? toDateInput(at) : '');
    setTime(at ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : '10:00');
    setTeam(current?.team.map((t) => t.id) ?? []);
    setAddress(current?.address ?? order.installationAddress ?? '');
    setMapUrl(current?.mapUrl ?? '');
    setContactPhone(current?.contactPhone ?? '');
    setMountingType(current?.mountingType ?? '');
    setSizesNote(current?.sizesNote ?? '');
    setRequiredItems(current?.requiredItems.join(', ') ?? '');
    setCancelReason(null);
    setOpen(true);
  };

  const { data: installers } = useQuery({
    queryKey: ['users', 'INSTALLER'], queryFn: () => usersApi.list({ role: 'INSTALLER', active: true }), enabled: open,
  });

  const create = useMutation({
    mutationFn: (force: boolean) => {
      const body = {
        // Sana bo'sh — keyin kelishiladi; jamoa bo'sh — ustanovkachilar o'zlari qo'shiladi
        scheduledAt: date ? new Date(`${date}T${time}:00`).toISOString() : null,
        teamIds: team,
        address: address.trim() || undefined,
        mapUrl: mapUrl.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        mountingType: mountingType.trim() || undefined,
        sizesNote: sizesNote.trim() || undefined,
        requiredItems: requiredItems.split(',').map((s) => s.trim()).filter(Boolean),
        force,
      };
      return current ? installationsApi.update(current.id, body) : installationsApi.create({ orderId: order.id, ...body });
    },
    onSuccess: () => { toast.success('O\'rnatish saqlandi'); setOpen(false); invalidateOrderViews(qc); },
    onError: (err) => {
      // Kun to'la bo'lsa — foydalanuvchidan tasdiq so'rab qayta yuboramiz
      if (err instanceof ApiError && err.status === 409 && window.confirm(`${err.message}\n\nBaribir rejalashtirasizmi?`)) create.mutate(true);
      else toast.error(err);
    },
  });
  const [cancelReason, setCancelReason] = React.useState<string | null>(null);
  const cancel = useMutation({
    mutationFn: () => installationsApi.cancel(current!.id, cancelReason ?? ''),
    onSuccess: () => { toast.success('Montaj bekor qilindi'); setOpen(false); setCancelReason(null); invalidateOrderViews(qc); },
    onError: toast.error,
  });
  const resolve = useMutation({
    mutationFn: installationsApi.resolveProblem,
    onSuccess: () => invalidateOrderViews(qc),
    onError: toast.error,
  });

  const closed = order.status === 'YAKUNLANDI' || order.status === 'BEKOR_QILINDI';
  if (!order.needsInstallation && order.installations.length === 0) {
    return <Card title="O'rnatish"><p className="py-2 text-center text-sm text-gray-500">O'rnatish talab qilinmaydi.</p></Card>;
  }

  return (
    <Card title="O'rnatish" actions={isFinance(user.role) && !closed ? <Button size="sm" variant="outline" onClick={openEditor}>{current ? 'Tahrirlash' : 'Rejalashtirish'}</Button> : undefined}>
      {order.installationAddress && (
        <div className="mb-4 flex items-start space-x-3 rounded-lg border border-brand-100 bg-brand-50 p-3 text-brand-800">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">{order.installationAddress}</p>
        </div>
      )}
      <div className="space-y-3">
        {order.installations.map((i) => (
          <div key={i.id} className="rounded-lg border border-gray-100 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center font-medium"><Calendar className="mr-2 h-4 w-4 text-gray-400" />{i.scheduledAt ? formatDateTime(i.scheduledAt) : 'Sana kelishilmagan'}</span>
              <Badge variant={i.status === 'DONE' ? 'success' : i.status === 'PROBLEM' ? 'error' : i.status === 'CANCELLED' ? 'default' : 'info'}>{INSTALL_STATUS_LABELS[i.status]}</Badge>
            </div>
            <p className="mt-1 text-xs text-gray-500">{i.team.length ? i.team.map((t) => t.fullName).join(', ') : 'Ustanovkachilar hali qo\'shilmagan — ular "Ochiq ishlar"dan o\'zlari qo\'shiladi'}</p>
            {i.problems.map((p) => (
              <div key={p.id} className="mt-2 flex items-center justify-between rounded bg-red-50 p-2 text-xs text-red-800">
                <span><b>{PROBLEM_LABELS[p.type]}:</b> {p.description}</span>
                {!p.resolved && isFinance(user.role) ? (
                  <button className="font-bold text-red-700 underline" onClick={() => resolve.mutate(p.id)}>Hal qilindi</button>
                ) : p.resolved && <span className="text-emerald-700">✓</span>}
              </div>
            ))}
            {i.afterPhotos.length > 0 && (
              <div className="mt-2 flex gap-2">
                {i.afterPhotos.map((u) => <a key={u} href={fileUrl(u)} target="_blank" rel="noreferrer"><img src={fileUrl(u)} alt="Natija" className="h-14 w-14 rounded object-cover" /></a>)}
              </div>
            )}
          </div>
        ))}
        {order.installations.length === 0 && <p className="text-center text-sm text-gray-400">Hali rejalashtirilmagan</p>}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={current ? 'O\'rnatishni tahrirlash' : 'O\'rnatishni rejalashtirish'}
        size="lg"
        footer={cancelReason !== null ? (
          <>
            <Button variant="outline" onClick={() => setCancelReason(null)}>Orqaga</Button>
            <Button variant="danger" disabled={cancelReason.trim().length < 3} isLoading={cancel.isPending} onClick={() => cancel.mutate()}>Montajni bekor qilish</Button>
          </>
        ) : (
          <>
            {/* Boshlanmagan montajni bekor qilish (mijoz o'zi olib ketdi va h.k.) */}
            {current && (current.status === 'PLANNED' || current.status === 'ON_THE_WAY') && (
              <Button variant="ghost" className="text-red-600 sm:mr-auto" onClick={() => setCancelReason('')}>Montajni bekor qilish</Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Yopish</Button>
            <Button disabled={!!date && !time} isLoading={create.isPending} onClick={() => create.mutate(false)}>Saqlash</Button>
          </>
        )}
      >
        {cancelReason !== null ? (
          <Textarea label="Nega bekor qilinmoqda?" rows={3} autoFocus value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Mijoz mahsulotni o'zi olib ketdi" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Sana (bo'sh — keyin kelishiladi)" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label="Vaqt" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <div className="md:col-span-2"><Input label="Manzil" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <Input label="Xarita havolasi (Google/Yandex)" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://" />
            <Input label="Joyidagi aloqa telefoni" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            <Input label="Mahkamlash turi" value={mountingType} onChange={(e) => setMountingType(e.target.value)} placeholder="Devorga, dyubel" />
            <Input label="Aniq o'lchamlar" value={sizesNote} onChange={(e) => setSizesNote(e.target.value)} />
            <div className="md:col-span-2"><Input label="Olib ketiladigan narsalar (vergul bilan)" value={requiredItems} onChange={(e) => setRequiredItems(e.target.value)} placeholder="Narvon, perforator, silikon" /></div>
            <div className="md:col-span-2">
              <p className="mb-1 text-sm font-medium text-gray-700">Jamoa</p>
              <p className="mb-2 text-xs text-gray-500">Bo'sh qoldirsangiz, ustanovkachilar o'zlari "Men boraman" bilan qo'shiladi</p>
              <div className="flex flex-wrap gap-2">
                {installers?.map((u) => {
                  const on = team.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setTeam((t) => (on ? t.filter((x) => x !== u.id) : [...t, u.id]))}
                      className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-gray-900 bg-brand-300 font-medium text-gray-900' : 'border-gray-200 text-gray-600'}`}
                    >
                      {u.fullName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
