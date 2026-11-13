import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/api';
import type { UserRef } from '@/types';
import { toDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

/** Backend bilan bir xil: necha kun orqaga belgilash mumkin */
const MAX_DAYS_BACK = 7;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface NightWorkPreset {
  userId?: string;
  day?: string;
}

interface Props {
  preset: NightWorkPreset | null;
  onClose: () => void;
  users: UserRef[];
  selfId?: string;
  workEndTime: string;
  nightGraceHours: number;
}

/** Ish tugash vaqtidan oldingi soat — ertasi kun (masalan, 18:00 da tugasa "03:00" — ertasi kuni 03:00) */
const nextDayHint = (until: string, workEnd: string) => (HHMM.test(until) && until <= workEnd ? 'ertasi kuni' : 'shu kuni');

/** Tunab ishlagan xodimni keyin belgilash: «Ketdim» jarimasi o'chadi, soatlar qo'shimcha ish, ertasi kun kechiriladi */
export function NightWorkModal({ preset, onClose, users, selfId, workEndTime, nightGraceHours }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const today = toDateInput(new Date());
  const oldest = toDateInput(new Date(Date.now() - MAX_DAYS_BACK * 24 * 3600_000));
  const yesterday = toDateInput(new Date(Date.now() - 24 * 3600_000));
  const [userId, setUserId] = React.useState('');
  const [day, setDay] = React.useState(yesterday);
  const [until, setUntil] = React.useState('03:00');
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!preset) return;
    setUserId(preset.userId ?? '');
    setDay(preset.day && preset.day >= oldest && preset.day <= today ? preset.day : yesterday);
    setUntil('03:00');
    setNote('');
    setErrors({});
  }, [preset, oldest, today, yesterday]);

  const save = useMutation({
    mutationFn: () => attendanceApi.markNight({ userId, day, until, note: note.trim() }),
    onSuccess: () => {
      toast.success('Tungi ish belgilandi');
      for (const key of ['attendance', 'payroll', 'payroll-sheet']) void qc.invalidateQueries({ queryKey: [key] });
      onClose();
    },
    onError: toast.error,
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!userId) e.userId = 'Xodimni tanlang';
    if (!day || day > today || day < oldest) e.day = `Oxirgi ${MAX_DAYS_BACK} kun ichida`;
    if (!HHMM.test(until)) e.until = 'Vaqtni kiriting';
    if (note.trim().length < 3) e.note = 'Sababini yozing';
    setErrors(e);
    if (Object.keys(e).length === 0) save.mutate();
  };

  return (
    <Modal
      open={!!preset}
      onClose={onClose}
      title="Tungi ishni belgilash"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={submit}>Belgilash</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <ul className="list-disc space-y-1 rounded-lg bg-indigo-50 py-2 pl-7 pr-3 text-xs text-indigo-900">
          <li>«Ketdim» bosilmagan jarimasi o'chadi</li>
          <li>{workEndTime} dan keyingi soatlar qo'shimcha ish bo'lib oylikka qo'shiladi</li>
          {nightGraceHours > 0 && <li>Yarim tundan keyin tugagan bo'lsa — ertasi kuni {nightGraceHours} soatgacha kechikish kechiriladi</li>}
        </ul>
        <Select
          label="Xodim"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Tanlang"
          options={users.filter((u) => u.id !== selfId).map((u) => ({ value: u.id, label: u.fullName }))}
          error={errors.userId}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Qaysi kuni ishga kelgan" type="date" min={oldest} max={today} value={day} onChange={(e) => setDay(e.target.value)} error={errors.day} />
          <div>
            <Input label="Qachongacha ishladi" type="time" value={until} onChange={(e) => setUntil(e.target.value)} error={errors.until} />
            <p className="mt-1 text-xs text-gray-500">{nextDayHint(until, workEndTime)}</p>
          </div>
        </div>
        <Textarea label="Sababi" rows={2} placeholder="Masalan: shoshilinch buyurtmani tugatdi, ishxonada tunadi" value={note} onChange={(e) => setNote(e.target.value)} error={errors.note} />
      </div>
    </Modal>
  );
}
