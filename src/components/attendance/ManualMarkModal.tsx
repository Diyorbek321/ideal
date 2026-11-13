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

export interface ManualMarkPreset {
  userId?: string;
  day?: string;
}

interface Props {
  preset: ManualMarkPreset | null;
  onClose: () => void;
  users: UserRef[];
  /** O'zini belgilay olmaydi — ro'yxatdan chiqariladi */
  selfId?: string;
  workStartTime: string;
  workEndTime: string;
}

/** Rahbar xodimning kelishini qo'lda belgilaydi: ishxonada tunab qolgan, telefoni o'chgan va h.k. */
export function ManualMarkModal({ preset, onClose, users, selfId, workStartTime, workEndTime }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const today = toDateInput(new Date());
  const oldest = toDateInput(new Date(Date.now() - MAX_DAYS_BACK * 24 * 3600_000));
  const [userId, setUserId] = React.useState('');
  const [day, setDay] = React.useState(today);
  const [time, setTime] = React.useState(workStartTime);
  const [outTime, setOutTime] = React.useState(workEndTime);
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Har ochilishda toza holat (katakdan ochilsa — xodim va kun tayyor)
  React.useEffect(() => {
    if (!preset) return;
    setUserId(preset.userId ?? '');
    setDay(preset.day && preset.day >= oldest && preset.day <= today ? preset.day : today);
    setTime(workStartTime);
    setOutTime(workEndTime);
    setNote('');
    setErrors({});
  }, [preset, oldest, today, workStartTime, workEndTime]);

  const past = day < today;
  const save = useMutation({
    mutationFn: () => attendanceApi.markManual({ userId, day, time, note: note.trim(), ...(past && { outTime }) }),
    onSuccess: () => {
      toast.success('Kelish belgilandi');
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      onClose();
    },
    onError: toast.error,
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!userId) e.userId = 'Xodimni tanlang';
    if (!day || day > today || day < oldest) e.day = `Bugun yoki oxirgi ${MAX_DAYS_BACK} kun ichida`;
    if (!HHMM.test(time)) e.time = 'Vaqtni kiriting';
    else if (day === today && time > new Date().toTimeString().slice(0, 5)) e.time = 'Bu vaqt hali kelmagan';
    if (past && (!HHMM.test(outTime) || outTime <= time)) e.outTime = 'Ketish vaqti kelishdan keyin bo\'lsin';
    if (note.trim().length < 3) e.note = 'Sababini yozing';
    setErrors(e);
    if (Object.keys(e).length === 0) save.mutate();
  };

  return (
    <Modal
      open={!!preset}
      onClose={onClose}
      title="Kelishni qo'lda belgilash"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={submit}>Belgilash</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
          Xodim ishxonada tunab qolgan yoki o'zi «Keldim»ni bosa olmagan kunlar uchun. Kim belgilagani va sababi jurnalda saqlanadi.
        </p>
        <Select
          label="Xodim"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Tanlang"
          options={users.filter((u) => u.id !== selfId).map((u) => ({ value: u.id, label: u.fullName }))}
          error={errors.userId}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="Sana" type="date" min={oldest} max={today} value={day} onChange={(e) => setDay(e.target.value)} error={errors.day} />
          <Input label="Kelgan vaqti" type="time" value={time} onChange={(e) => setTime(e.target.value)} error={errors.time} />
          {past && <Input label="Ketgan vaqti" type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} error={errors.outTime} />}
        </div>
        {!past && <p className="text-xs text-gray-500">Bugungi kun ochiq qoladi — ketishda xodim o'zi «Ketdim»ni bosadi.</p>}
        <Textarea label="Sababi" rows={2} placeholder="Masalan: ishxonada tunab qoldi, buyurtmani tugatdi" value={note} onChange={(e) => setNote(e.target.value)} error={errors.note} />
      </div>
    </Modal>
  );
}
