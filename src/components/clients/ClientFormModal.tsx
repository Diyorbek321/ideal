import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { clientsApi } from '@/api';
import type { Client, ClientDuplicate, ClientType, OrderSource } from '@/types';
import { useDebounced } from '@/lib/useDebounced';
import { CLIENT_TYPE_LABELS, SOURCE_LABELS, options } from '@/lib/labels';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  client?: Client;
  initialName?: string;
  onSaved?: (c: Client) => void;
}

const empty = (name = '') => ({
  name, type: 'COMPANY' as ClientType, source: 'WALK_IN' as OrderSource, phones: '', inn: '', contactPerson: '',
  telegram: '', address: '', bankDetails: '', notes: '', smsOptOut: false,
});

export function ClientFormModal({ open, onClose, client, initialName, onSaved }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = React.useState(empty(initialName));

  React.useEffect(() => {
    if (!open) return;
    setForm(client ? {
      name: client.name, type: client.type, source: client.source, phones: client.phones.join(', '),
      inn: client.inn ?? '', contactPerson: client.contactPerson ?? '', telegram: client.telegram ?? '',
      address: client.address ?? '', bankDetails: client.bankDetails ?? '', notes: client.notes ?? '', smsOptOut: client.smsOptOut,
    } : empty(initialName));
  }, [open, client, initialName]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Nomini kiriting (kamida 2 belgi)';
    const phones = form.phones.split(',').map((p) => p.replace(/\D/g, '')).filter(Boolean);
    if (phones.length === 0) e.phones = 'Kamida bitta telefon kiriting';
    else if (phones.some((p) => p.length !== 9 && !(p.length === 12 && p.startsWith('998')))) e.phones = 'Telefon 9 raqam bo\'lsin: 90 123 45 67';
    if (form.inn.trim() && !/^\d{9}$|^\d{14}$/.test(form.inn.trim())) e.inn = 'STIR 9 yoki JSHSHIR 14 raqam';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = () => validate() && save.mutate();

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        type: form.type,
        source: form.source,
        phones: form.phones.split(',').map((p) => p.trim()).filter(Boolean),
        inn: form.inn.trim() || null,
        contactPerson: form.contactPerson.trim() || null,
        telegram: form.telegram.trim() || null,
        address: form.address.trim() || null,
        bankDetails: form.bankDetails.trim() || null,
        notes: form.notes.trim() || null,
        smsOptOut: form.smsOptOut,
      };
      return client ? clientsApi.update(client.id, body) : clientsApi.create(body);
    },
    onSuccess: (c) => {
      toast.success(client ? 'Mijoz yangilandi' : 'Mijoz qo\'shildi');
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client', c.id] });
      onSaved?.(c);
      onClose();
    },
    onError: toast.error,
  });

  const isOrg = form.type !== 'INDIVIDUAL';

  // Yozish paytida "oldin kiritilgan" tekshiruvi: telefon/STIR — aniq takror, nom — ogohlantirish
  const dupQuery = useDebounced({
    phones: form.phones.split(',').map((p) => p.replace(/\D/g, '')).filter((p) => p.length >= 9).join(','),
    inn: /^\d{9}$|^\d{14}$/.test(form.inn.trim()) ? form.inn.trim() : '',
    name: form.name.trim().length >= 3 ? form.name.trim() : '',
  }, 400);
  const { data: dups } = useQuery({
    queryKey: ['client-duplicates', dupQuery, client?.id],
    queryFn: () => clientsApi.duplicates({
      phones: dupQuery.phones || undefined, inn: dupQuery.inn || undefined, name: dupQuery.name || undefined, excludeId: client?.id,
    }),
    enabled: open && !!(dupQuery.phones || dupQuery.inn || dupQuery.name),
  });
  const exact = (dups ?? []).filter((d) => d.match !== 'name');
  const byName = exact.length ? [] : (dups ?? []).filter((d) => d.match === 'name');

  const pick = useMutation({
    mutationFn: (d: ClientDuplicate) => clientsApi.get(d.id),
    onSuccess: (c) => { onSaved?.(c); onClose(); },
    onError: toast.error,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
      size="lg"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} disabled={exact.length > 0} onClick={submit}>Saqlash</Button>
        </>
      )}
    >
      {(exact.length > 0 || byName.length > 0) && (
        <div className={`mb-4 rounded-xl border p-3 text-sm ${exact.length ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          <p className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            {exact.length ? 'Bu mijoz oldin kiritilgan' : 'Shu nomli mijoz bor — oldin kiritilgan bo\'lishi mumkin'}
          </p>
          <ul className="space-y-1.5">
            {(exact.length ? exact : byName).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.name}</span>
                <span className="text-xs opacity-80">{d.phones.join(', ')}</span>
                <span className="text-xs opacity-80">{d.match === 'phone' ? '· telefon mos' : d.match === 'inn' ? '· STIR mos' : '· nom mos'}</span>
                {d.isArchived && <span className="rounded bg-white/70 px-1.5 text-xs">arxivda</span>}
                {onSaved && !d.isArchived ? (
                  <Button size="sm" variant="outline" isLoading={pick.isPending && pick.variables?.id === d.id} onClick={() => pick.mutate(d)}>Shu mijozni tanlash</Button>
                ) : (
                  <Link to={`/clients/${d.id}`} onClick={onClose} className="text-xs font-semibold underline">Ochish</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="md:col-span-2"><Input label="Nomi / F.I.Sh. *" value={form.name} onChange={set('name')} autoFocus error={errors.name} /></div>
        <Select label="Turi" value={form.type} onChange={set('type')} options={options(CLIENT_TYPE_LABELS)} />
        <Select label="Qayerdan keldi" value={form.source} onChange={set('source')} options={options(SOURCE_LABELS)} />
        <Input label="Telefon(lar) * — vergul bilan" value={form.phones} onChange={set('phones')} phone placeholder="94 364 44 01, 91 ..." error={errors.phones} />
        <Input label="Telegram" value={form.telegram} onChange={set('telegram')} placeholder="@username" />
        {isOrg && <Input label="Mas'ul shaxs" value={form.contactPerson} onChange={set('contactPerson')} />}
        {isOrg && <Input label="STIR (INN)" value={form.inn} onChange={set('inn')} inputMode="numeric" maxLength={14} error={errors.inn} />}
        <div className="md:col-span-2"><Input label="Manzil" value={form.address} onChange={set('address')} /></div>
        {isOrg && <div className="md:col-span-2"><Textarea label="Bank rekvizitlari" value={form.bankDetails} onChange={set('bankDetails')} rows={2} /></div>}
        <div className="md:col-span-2"><Textarea label="Izoh" value={form.notes} onChange={set('notes')} rows={2} /></div>
        <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
          <input type="checkbox" checked={form.smsOptOut} onChange={(e) => setForm((f) => ({ ...f, smsOptOut: e.target.checked }))} />
          Avtomatik SMS yuborilmasin
        </label>
      </form>
    </Modal>
  );
}
