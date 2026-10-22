import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi } from '@/api';
import type { OrderDetail } from '@/types';
import { HEARD_FROM_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { Stars } from '@/components/feedback/Stars';

/** Yakunlangan buyurtma: mijoz bahosi yoki uni telefon orqali kiritish */
export function FeedbackCard({ order }: { order: OrderDetail }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const save = useMutation({
    mutationFn: (body: Parameters<typeof feedbackApi.createForOrder>[1]) => feedbackApi.createForOrder(order.id, body),
    onSuccess: () => { toast.success('Baho saqlandi'); setOpen(false); qc.invalidateQueries({ queryKey: ['order', order.id] }); },
    onError: toast.error,
  });
  if (order.status !== 'YAKUNLANDI') return null;
  const f = order.feedback;
  return (
    <Card title="Mijoz bahosi">
      {f ? (
        <div className="space-y-1 text-sm">
          <Stars value={f.rating} size="md" />
          {f.comment && <p className="text-gray-700">“{f.comment}”</p>}
          <p className="text-xs text-gray-500">
            {[f.quality && `sifat ${f.quality}`, f.speed && `tezlik ${f.speed}`, f.service && `muomala ${f.service}`, f.heardFrom && HEARD_FROM_LABELS[f.heardFrom]].filter(Boolean).join(' · ')}
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Mijoz hali baholamagan — SMS dagi havola orqali baholashi mumkin.</p>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Telefonda so'rab kiritish</Button>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Mijoz bahosi">
        <FeedbackForm isLoading={save.isPending} onSubmit={(b) => save.mutate(b)} />
      </Modal>
    </Card>
  );
}
