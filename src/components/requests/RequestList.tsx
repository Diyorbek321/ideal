import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Inbox, X } from 'lucide-react';
import { requestsApi } from '@/api';
import type { PaymentMethod, RequestStatus, StaffRequest } from '@/types';
import { ABSENCE_LABELS, METHOD_LABELS, REQUEST_KIND_LABELS, REQUEST_STATUS_LABELS, ROLE_LABELS, options } from '@/lib/labels';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const dm = (day: string) => day.split('-').reverse().join('.');
const STATUS_VARIANT: Record<RequestStatus, 'warning' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error', CANCELLED: 'default',
};

export function requestSummary(r: StaffRequest): string {
  if (r.kind === 'ABSENCE') {
    const range = r.dayFrom === r.dayTo ? dm(r.dayFrom!) : `${dm(r.dayFrom!)} – ${dm(r.dayTo!)}`;
    return `${ABSENCE_LABELS[r.absenceReason!]}: ${range}`;
  }
  if (r.kind === 'ADVANCE') return `Avans: ${formatCurrency(r.amount ?? 0)}`;
  return `${r.disputeTarget === 'LATE' ? 'Kechikish' : 'Erta ketish'}ga e'tiroz${r.attendanceDay ? ` · ${dm(r.attendanceDay)}` : ''}`;
}

/** Direktor uchun: tasdiqlash/rad etish, avansda — qanday berilgani */
function ReviewActions({ r }: { r: StaffRequest }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [note, setNote] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('CASH');
  const review = useMutation({
    mutationFn: (approve: boolean) => requestsApi.review(r.id, { approve, reviewNote: note.trim() || undefined, method: r.kind === 'ADVANCE' ? method : undefined }),
    onSuccess: (_, approve) => {
      toast.success(approve ? 'Tasdiqlandi' : 'Rad etildi');
      for (const key of ['requests', 'payroll', 'attendance']) void qc.invalidateQueries({ queryKey: [key] });
    },
    onError: toast.error,
  });
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1"><Input placeholder="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      {r.kind === 'ADVANCE' && (
        <Select aria-label="To'lov usuli" value={method} options={options(METHOD_LABELS)} onChange={(e) => setMethod(e.target.value as PaymentMethod)} />
      )}
      <div className="flex gap-2">
        <Button size="sm" isLoading={review.isPending && review.variables} onClick={() => review.mutate(true)}><Check className="h-4 w-4" />Tasdiqlash</Button>
        <Button size="sm" variant="outline" isLoading={review.isPending && !review.variables} onClick={() => review.mutate(false)}><X className="h-4 w-4" />Rad etish</Button>
      </div>
    </div>
  );
}

function CancelButton({ id }: { id: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => requestsApi.cancel(id),
    onSuccess: () => { toast.success('Bekor qilindi'); void qc.invalidateQueries({ queryKey: ['requests'] }); },
    onError: toast.error,
  });
  return <Button size="sm" variant="ghost" isLoading={cancel.isPending} onClick={() => cancel.mutate()}>Bekor qilish</Button>;
}

export function RequestList({ items, mode }: { items: StaffRequest[]; mode: 'mine' | 'review' }) {
  if (!items.length) return <Empty icon={Inbox} text="So'rovlar yo'q" />;
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((r) => (
        <li key={r.id} className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {r.user && <>{r.user.fullName} <span className="text-xs font-normal text-gray-500">({ROLE_LABELS[r.user.role]})</span> · </>}
                {requestSummary(r)}
              </p>
              <p className="text-sm text-gray-600">{r.note}</p>
              <p className="text-xs text-gray-400">
                {REQUEST_KIND_LABELS[r.kind]} · {formatDateTime(r.createdAt)}
                {r.reviewNote && <> · Izoh: <span className="text-gray-600">{r.reviewNote}</span></>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[r.status]}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
              {mode === 'mine' && r.status === 'PENDING' && <CancelButton id={r.id} />}
            </div>
          </div>
          {mode === 'review' && r.status === 'PENDING' && <ReviewActions r={r} />}
        </li>
      ))}
    </ul>
  );
}
