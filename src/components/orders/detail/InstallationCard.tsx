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
import { useToast } from '@/components/ui/Toast';

export function InstallationCard({ order }: { order: OrderDetail }) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(toDateInput(new Date(Date.now() + 86_400_000)));
  const [time, setTime] = React.useState('10:00');
  const [team, setTeam] = React.useState<string[]>([]);
  const [address, setAddress] = React.useState(order.installationAddress ?? '');
  const [mapUrl, setMapUrl] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [mountingType, setMountingType] = React.useState('');
  const [sizesNote, setSizesNote] = React.useState('');
  const [requiredItems, setRequiredItems] = React.useState('');

  const { data: installers } = useQuery({
    queryKey: ['users', 'INSTALLER'], queryFn: () => usersApi.list({ role: 'INSTALLER', active: true }), enabled: open,
  });

  const create = useMutation({
    mutationFn: (force: boolean) => installationsApi.create({
      orderId: order.id,
      scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
      teamIds: team,
      address: address.trim() || undefined,
      mapUrl: mapUrl.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      mountingType: mountingType.trim() || undefined,
      sizesNote: sizesNote.trim() || undefined,
      requiredItems: requiredItems.split(',').map((s) => s.trim()).filter(Boolean),
      force,
    }),
    onSuccess: () => { toast.success('O\'rnatish rejalashtirildi'); setOpen(false); invalidateOrderViews(qc); },
    onError: (err) => {
      // Kun to'la bo'lsa — foydalanuvchidan tasdiq so'rab qayta yuboramiz
      if (err instanceof ApiError && err.status === 409 && window.confirm(`${err.message}\n\nBaribir rejalashtirasizmi?`)) create.mutate(true);
      else toast.error(err);
    },
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
    <Card title="O'rnatish" actions={isFinance(user.role) && !closed ? <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Rejalashtirish</Button> : undefined}>
      {order.installationAddress && (
        <div className="mb-4 flex items-start space-x-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-800">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">{order.installationAddress}</p>
        </div>
      )}
      <div className="space-y-3">
        {order.installations.map((i) => (
          <div key={i.id} className="rounded-lg border border-gray-100 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center font-medium"><Calendar className="mr-2 h-4 w-4 text-gray-400" />{formatDateTime(i.scheduledAt)}</span>
              <Badge variant={i.status === 'DONE' ? 'success' : i.status === 'PROBLEM' ? 'error' : 'info'}>{INSTALL_STATUS_LABELS[i.status]}</Badge>
            </div>
            <p className="mt-1 text-xs text-gray-500">{i.team.map((t) => t.fullName).join(', ')}</p>
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
        title="O'rnatishni rejalashtirish"
        size="lg"
        footer={(
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button disabled={!team.length || !date || !time} isLoading={create.isPending} onClick={() => create.mutate(false)}>Saqlash</Button>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Sana" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Vaqt" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <div className="md:col-span-2"><Input label="Manzil" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <Input label="Xarita havolasi (Google/Yandex)" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://" />
          <Input label="Joyidagi aloqa telefoni" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <Input label="Mahkamlash turi" value={mountingType} onChange={(e) => setMountingType(e.target.value)} placeholder="Devorga, dyubel" />
          <Input label="Aniq o'lchamlar" value={sizesNote} onChange={(e) => setSizesNote(e.target.value)} />
          <div className="md:col-span-2"><Input label="Olib ketiladigan narsalar (vergul bilan)" value={requiredItems} onChange={(e) => setRequiredItems(e.target.value)} placeholder="Narvon, perforator, silikon" /></div>
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-gray-700">Jamoa *</p>
            <div className="flex flex-wrap gap-2">
              {installers?.map((u) => {
                const on = team.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setTeam((t) => (on ? t.filter((x) => x !== u.id) : [...t, u.id]))}
                    className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                  >
                    {u.fullName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
