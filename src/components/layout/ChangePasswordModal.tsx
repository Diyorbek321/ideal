import React from 'react';
import { authApi } from '@/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const MIN_LENGTH = 8;
const empty = { current: '', next: '', repeat: '' };

export default function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = React.useState(empty);
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof empty, string>>>({});
  const [saving, setSaving] = React.useState(false);

  const close = () => {
    setF(empty);
    setErrors({});
    onClose();
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!f.current) e.current = 'Joriy parolni kiriting';
    if (f.next.length < MIN_LENGTH) e.next = `Kamida ${MIN_LENGTH} belgi`;
    else if (f.next === f.current) e.next = 'Yangi parol eskisidan farq qilishi kerak';
    if (f.repeat !== f.next) e.repeat = 'Parollar mos emas';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await authApi.changePassword(f.current, f.next);
      toast.success('Parol o\'zgartirildi');
      close();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Parolni o'zgartirish"
      footer={<>
        <Button variant="outline" onClick={close}>Bekor qilish</Button>
        <Button type="submit" form="change-password" isLoading={saving}>Saqlash</Button>
      </>}
    >
      <form id="change-password" onSubmit={submit} className="space-y-4">
        <Input label="Joriy parol" type="password" autoComplete="current-password" value={f.current}
          onChange={(e) => setF({ ...f, current: e.target.value })} error={errors.current} autoFocus />
        <Input label="Yangi parol" type="password" autoComplete="new-password" value={f.next}
          onChange={(e) => setF({ ...f, next: e.target.value })} error={errors.next} />
        <Input label="Yangi parolni takrorlang" type="password" autoComplete="new-password" value={f.repeat}
          onChange={(e) => setF({ ...f, repeat: e.target.value })} error={errors.repeat} />
      </form>
    </Modal>
  );
}
