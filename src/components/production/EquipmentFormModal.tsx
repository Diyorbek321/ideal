import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { equipmentApi } from '@/api';
import type { Equipment, EquipmentStatus, EquipmentType } from '@/types';
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_TYPE_LABELS, options } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

interface Props {
  /** null — yangi uskuna */
  equipment: Equipment | null;
  onClose: () => void;
}

/** Uskuna qo'shish/tahrirlash; qo'shish va o'chirish — faqat direktor */
export function EquipmentFormModal({ equipment, onClose }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const isAdmin = useUser().role === 'ADMIN';
  const [name, setName] = React.useState(equipment?.name ?? '');
  const [type, setType] = React.useState<EquipmentType>(equipment?.type ?? 'PRINTER');
  const [status, setStatus] = React.useState<EquipmentStatus>(equipment?.status ?? 'IDLE');
  const [notes, setNotes] = React.useState(equipment?.notes ?? '');

  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['equipment'] });
    onClose();
  };
  const save = useMutation({
    mutationFn: () => {
      if (!name.trim()) return Promise.reject(new Error('Uskuna nomini kiriting'));
      const body = { name: name.trim(), type, status, notes: notes.trim() || null };
      return equipment ? equipmentApi.update(equipment.id, body) : equipmentApi.create(body);
    },
    onSuccess: () => done(equipment ? 'Saqlandi' : 'Uskuna qo\'shildi'),
    onError: toast.error,
  });
  const remove = useMutation({
    mutationFn: () => equipmentApi.remove(equipment!.id),
    onSuccess: () => done('Uskuna o\'chirildi'),
    onError: toast.error,
  });

  return (
    <Modal open onClose={onClose} title={equipment ? equipment.name : 'Yangi uskuna'}
      footer={(
        <>
          {equipment && isAdmin && (
            <Button variant="ghost" className="text-red-600 sm:mr-auto" isLoading={remove.isPending}
              onClick={() => window.confirm(`«${equipment.name}» ni o'chirasizmi?`) && remove.mutate()}>
              <Trash2 className="h-4 w-4" />O'chirish
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </>
      )}>
      <div className="space-y-4">
        <Input label="Nomi" value={name} onChange={(e) => setName(e.target.value)} placeholder="Roland VG3-640" autoFocus />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Turi" value={type} onChange={(e) => setType(e.target.value as EquipmentType)} options={options(EQUIPMENT_TYPE_LABELS)} />
          <Select label="Holati" value={status} onChange={(e) => setStatus(e.target.value as EquipmentStatus)} options={options(EQUIPMENT_STATUS_LABELS)} />
        </div>
        <Textarea label="Izoh" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
