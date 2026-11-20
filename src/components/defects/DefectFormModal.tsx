import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import { defectsApi, ordersApi, usersApi } from '@/api';
import type { Defect, DefectStage } from '@/types';
import { ROLE_LABELS, options } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { fileUrl, formatCurrency, parseMoney } from '@/lib/utils';
import { useDebounced } from '@/lib/useDebounced';
import { Button } from '@/components/ui/Button';
import { FileButton } from '@/components/ui/FileButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

export const STAGE_LABELS: Record<DefectStage, string> = {
  DESIGN: 'Dizayn', PRINT: 'Pechat', PRODUCTION: 'Ishlab chiqarish (kesish, yig\'ish)', INSTALLATION: 'Montaj', OTHER: 'Boshqa',
};

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tahrirlash uchun — bo'lmasa yangi */
  defect?: Defect | null;
}

export function DefectFormModal({ open, onClose, defect }: Props) {
  const me = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const isAdmin = me.role === 'ADMIN';
  const users = useQuery({ queryKey: ['users', 'active'], queryFn: () => usersApi.list({ active: true }), enabled: open });

  const [userId, setUserId] = React.useState('');
  const [stage, setStage] = React.useState<DefectStage>('PRINT');
  const [date, setDate] = React.useState(today());
  const [description, setDescription] = React.useState('');
  const [loss, setLoss] = React.useState('');
  const [deduct, setDeduct] = React.useState('');
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<{ id: string; number: string } | null>(null);
  const [orderQ, setOrderQ] = React.useState('');
  const q = useDebounced(orderQ);
  const found = useQuery({ queryKey: ['orders', 'defect-search', q], queryFn: () => ordersApi.list({ search: q, limit: 6 }), enabled: q.length >= 2 && !order });

  React.useEffect(() => {
    if (!open) return;
    setUserId(defect?.userId ?? '');
    setStage(defect?.stage ?? 'PRINT');
    setDate(defect ? defect.occurredAt.slice(0, 10) : today());
    setDescription(defect?.description ?? '');
    setLoss(defect ? String(defect.lossAmount) : '');
    setDeduct(defect?.deductAmount ? String(defect.deductAmount) : '');
    setPhotoUrl(defect?.photoUrl ?? null);
    setOrder(defect?.order ?? null);
    setOrderQ('');
  }, [open, defect]);

  const save = useMutation({
    mutationFn: () => {
      if (!userId) return Promise.reject(new Error('Xodimni tanlang'));
      if (description.trim().length < 3) return Promise.reject(new Error('Brakni qisqacha yozing'));
      const lossAmount = loss ? parseMoney(loss) ?? 0 : 0;
      const deductAmount = deduct ? parseMoney(deduct) ?? 0 : 0;
      if (deductAmount > lossAmount) return Promise.reject(new Error('Ushlab qolish zarardan ko\'p bo\'lmasligi kerak'));
      // Bugungi sana — hozirgi vaqt, o'tgan kun — kun o'rtasi (vaqt mintaqasida oy almashib ketmasin)
      const occurredAt = date === today() ? new Date().toISOString() : new Date(`${date}T12:00:00`).toISOString();
      const body = {
        userId, stage, description: description.trim(), lossAmount, photoUrl, occurredAt, orderId: order?.id ?? null,
        ...(isAdmin ? { deductAmount } : defect ? {} : { deductAmount: 0 }),
      };
      return defect ? defectsApi.update(defect.id, body) : defectsApi.create({ deductAmount: 0, ...body });
    },
    onSuccess: () => {
      toast.success(defect ? 'Brak yangilandi' : 'Brak yozildi');
      qc.invalidateQueries({ queryKey: ['defects'] });
      qc.invalidateQueries({ queryKey: ['payroll'] });
      onClose();
    },
    onError: toast.error,
  });

  const staff = (users.data ?? []).filter((u) => u.role !== 'ADMIN');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={defect ? 'Brakni tahrirlash' : 'Brak yozish'}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Kim xato qildi *" value={userId} onChange={(e) => setUserId(e.target.value)}
            options={[{ value: '', label: 'Tanlang' }, ...staff.map((u) => ({ value: u.id, label: `${u.fullName} (${ROLE_LABELS[u.role]})` }))]} />
          <Select label="Bosqich" value={stage} onChange={(e) => setStage(e.target.value as DefectStage)} options={options(STAGE_LABELS)} />
        </div>
        <Textarea label="Nima bo'ldi *" rows={3} placeholder="Masalan: banner rangi xato chiqdi, qayta pechat qilindi" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Sana" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Zarar (material + ish)" money inputMode="numeric" value={loss} onChange={(e) => setLoss(e.target.value)} />
        </div>
        <div>
          <Input
            label="Oylikdan ushlab qolish"
            money inputMode="numeric" value={deduct} onChange={(e) => setDeduct(e.target.value)}
            disabled={!isAdmin}
            placeholder={isAdmin ? '0 — ushlanmaydi' : 'Direktor belgilaydi'}
          />
          <p className="mt-1 text-xs text-gray-500">
            {isAdmin
              ? 'Kiritilsa, shu oy oylik varag\'iga «Jarima: Brak ...» bo\'lib tushadi. 0 qoldirsangiz faqat statistikada ko\'rinadi.'
              : 'Ushlab qolishni direktor hal qiladi — siz faqat brakni yozasiz.'}
            {loss && isAdmin ? ` Ko'pi bilan: ${formatCurrency(parseMoney(loss) ?? 0)}` : ''}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Buyurtma (ixtiyoriy)</label>
          {order ? (
            <div className="flex h-10 items-center justify-between rounded-md border border-brand-200 bg-brand-50 px-3 text-sm">
              <span className="font-medium text-brand-900">{order.number}</span>
              <button type="button" onClick={() => setOrder(null)} aria-label="Olib tashlash" className="text-brand-600"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <>
              <Input placeholder="Buyurtma raqami yoki mijoz..." value={orderQ} onChange={(e) => setOrderQ(e.target.value)} />
              {found.data && q.length >= 2 && (
                <div className="divide-y divide-gray-50 rounded-md border border-gray-100">
                  {found.data.data.map((o) => (
                    <button key={o.id} type="button" onClick={() => setOrder({ id: o.id, number: o.number })}
                      className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-gray-50">
                      <span><b className="text-brand-600">{o.number}</b> {o.client.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {photoUrl && (
            <div className="relative">
              <img src={fileUrl(photoUrl)} alt="Brak rasmi" className="h-20 w-20 rounded-lg object-cover" />
              <button type="button" onClick={() => setPhotoUrl(null)} aria-label="Rasmni olib tashlash"
                className="absolute -right-2 -top-2 rounded-full bg-white p-0.5 shadow"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <FileButton variant="outline" size="sm" accept="image/*" kind="PHOTO" capture paste="modal" onUploaded={(f) => setPhotoUrl(f.url)}>
            <ImagePlus className="h-4 w-4" />{photoUrl ? 'Rasmni almashtirish' : 'Rasm (ixtiyoriy)'}
          </FileButton>
        </div>
      </div>
    </Modal>
  );
}
