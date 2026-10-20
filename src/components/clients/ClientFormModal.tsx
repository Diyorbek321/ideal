import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api';
import type { Client, ClientType, OrderSource } from '@/types';
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
      size="lg"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </>
      )}
    >
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="md:col-span-2"><Input label="Nomi / F.I.Sh. *" value={form.name} onChange={set('name')} autoFocus /></div>
        <Select label="Turi" value={form.type} onChange={set('type')} options={options(CLIENT_TYPE_LABELS)} />
        <Select label="Qayerdan keldi" value={form.source} onChange={set('source')} options={options(SOURCE_LABELS)} />
        <Input label="Telefon(lar) * — vergul bilan" value={form.phones} onChange={set('phones')} placeholder="90 123 45 67, 91 ..." inputMode="tel" />
        <Input label="Telegram" value={form.telegram} onChange={set('telegram')} placeholder="@username" />
        {isOrg && <Input label="Mas'ul shaxs" value={form.contactPerson} onChange={set('contactPerson')} />}
        {isOrg && <Input label="STIR (INN)" value={form.inn} onChange={set('inn')} inputMode="numeric" maxLength={14} />}
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
