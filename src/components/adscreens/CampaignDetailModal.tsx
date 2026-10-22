import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Film, Phone } from 'lucide-react';
import { adScreensApi } from '@/api';
import type { AdCampaignPhase, PaymentMethod } from '@/types';
import { AD_PHASE_LABELS, METHOD_LABELS, options } from '@/lib/labels';
import { fileUrl, formatCurrency, formatDate, formatDateTime, formatPhone, parseMoney } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FileButton } from '@/components/ui/FileButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ErrorState, Loading } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

export const PHASE_BADGE: Record<AdCampaignPhase, 'info' | 'warning' | 'success' | 'default' | 'error'> = {
  BRON: 'warning', KUTILMOQDA: 'info', EFIRDA: 'success', TUGADI: 'default', BEKOR: 'error',
};

export function CampaignDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: c, isLoading, error } = useQuery({ queryKey: ['ad-screens', 'campaign', id], queryFn: () => adScreensApi.campaign(id) });
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('CASH');

  const refresh = () => qc.invalidateQueries({ queryKey: ['ad-screens'] });
  const update = useMutation({
    mutationFn: (body: Parameters<typeof adScreensApi.updateCampaign>[1]) => adScreensApi.updateCampaign(id, body),
    onSuccess: () => { toast.success('Saqlandi'); void refresh(); },
    onError: toast.error,
  });
  const pay = useMutation({
    mutationFn: () => adScreensApi.pay(id, { amount: parseMoney(amount) ?? 0, method }),
    onSuccess: () => { toast.success('To\'lov qabul qilindi'); setAmount(''); void refresh(); void qc.invalidateQueries({ queryKey: ['payments'] }); },
    onError: toast.error,
  });

  const cancelled = c?.status === 'BEKOR';

  return (
    <Modal open onClose={onClose} title={c ? `${c.number} · ${c.title}` : 'Reklama'} size="lg"
      footer={c && !cancelled ? (
        <>
          {c.paidAmount === 0 && <Button variant="ghost" onClick={() => update.mutate({ status: 'BEKOR' })}>Bronni bekor qilish</Button>}
          {c.status === 'BRON' && <Button onClick={() => update.mutate({ status: 'TASDIQLANDI' })} isLoading={update.isPending}>Kelishildi — tasdiqlash</Button>}
        </>
      ) : undefined}>
      {isLoading ? <Loading rows={4} /> : error || !c ? <ErrorState error={error} /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={PHASE_BADGE[c.phase]}>{AD_PHASE_LABELS[c.phase]}</Badge>
            {c.phase === 'EFIRDA' && <span className="text-sm text-gray-600">yana {c.daysLeft} kun</span>}
            {c.client.phones[0] && (
              <a href={`tel:${c.client.phones[0]}`} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
                <Phone className="h-4 w-4" />{formatPhone(c.client.phones[0])}
              </a>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <div><dt className="text-gray-500">Mijoz</dt><dd><Link to={`/clients/${c.client.id}`} className="font-semibold text-gray-900 hover:underline">{c.client.name}</Link></dd></div>
            <div><dt className="text-gray-500">Ekran</dt><dd className="font-semibold">{c.screen.name}</dd></div>
            <div><dt className="text-gray-500">Davr</dt><dd className="font-semibold">{formatDate(c.startDate)} – {formatDate(c.endDate)} ({c.days} kun)</dd></div>
            <div><dt className="text-gray-500">Slot</dt><dd className="font-semibold">{c.slots} × {c.screen.slotSeconds} s</dd></div>
            <div><dt className="text-gray-500">Kunlik narx</dt><dd className="font-semibold">{formatCurrency(c.pricePerDay)}</dd></div>
            <div><dt className="text-gray-500">Menejer</dt><dd className="font-semibold">{c.manager.fullName}</dd></div>
          </dl>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-sm">
            <div><p className="text-gray-500">Jami</p><p className="font-bold">{formatCurrency(c.totalAmount)}</p>{c.discount > 0 && <p className="text-xs text-gray-500">chegirma {formatCurrency(c.discount)}</p>}</div>
            <div><p className="text-gray-500">To'langan</p><p className="font-bold text-emerald-700">{formatCurrency(c.paidAmount)}</p></div>
            <div><p className="text-gray-500">Qoldiq</p><p className={c.remaining > 0 ? 'font-bold text-red-600' : 'font-bold'}>{formatCurrency(c.remaining)}</p></div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3">
            <Film className="h-5 w-5 text-gray-500" />
            {c.creativeUrl
              ? <a href={fileUrl(c.creativeUrl)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">Rolikni ko'rish</a>
              : <span className="text-sm text-gray-500">Rolik hali yuklanmagan</span>}
            {!cancelled && (
              <FileButton variant="outline" size="sm" className="ml-auto" accept="video/*,image/*" kind="DESIGN"
                onUploaded={(f) => update.mutate({ creativeUrl: f.url })}>
                {c.creativeUrl ? 'Almashtirish' : 'Rolik yuklash'}
              </FileButton>
            )}
          </div>

          {!cancelled && c.remaining > 0 && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Input label="To'lov summasi" inputMode="numeric" placeholder={String(c.remaining)} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Select label="Usul" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={options(METHOD_LABELS)} />
              <Button onClick={() => pay.mutate()} isLoading={pay.isPending} disabled={!parseMoney(amount)}>Qabul qilish</Button>
            </div>
          )}

          {!!c.payments?.length && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">To'lovlar</p>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
                {c.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="font-semibold">{formatCurrency(p.amount)}</span>
                    <span className="text-gray-500">{METHOD_LABELS[p.method]} · {p.user?.fullName}</span>
                    <span className="text-xs text-gray-500">{formatDateTime(p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.notes && <p className="whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{c.notes}</p>}
        </div>
      )}
    </Modal>
  );
}
