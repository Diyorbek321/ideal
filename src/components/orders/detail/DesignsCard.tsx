import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Download, Send, Share2, Upload, X } from 'lucide-react';
import { designsApi } from '@/api';
import type { DesignStatus, OrderDetail, ShareInfo } from '@/types';
import { DESIGN_STATUS_LABELS } from '@/lib/labels';
import { isFinance, useUser } from '@/lib/auth';
import { fileUrl, formatDateTime } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { DesignUploadModal } from '@/components/design/DesignUploadModal';
import { ShareModal } from '@/components/design/ShareModal';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

export const DESIGN_VARIANT: Record<DesignStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'default', SENT: 'info', APPROVED: 'success', CHANGES_REQUESTED: 'warning', SUPERSEDED: 'outline',
};

export function DesignsCard({ order }: { order: OrderDetail }) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = React.useState(false);
  const [share, setShare] = React.useState<ShareInfo | null>(null);
  const canUpload = order.status === 'DIZAYNDA' && (isFinance(user.role) || order.designerId === user.id);
  const refresh = () => invalidateOrderViews(qc);

  const send = useMutation({
    mutationFn: designsApi.send,
    onSuccess: (info) => { setShare(info); refresh(); },
    onError: toast.error,
  });
  const getShare = useMutation({ mutationFn: designsApi.share, onSuccess: setShare, onError: toast.error });
  const decide = useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: 'APPROVE' | 'REQUEST_CHANGES'; comment?: string }) =>
      designsApi.decide(id, decision, comment),
    onSuccess: (_, v) => { toast.success(v.decision === 'APPROVE' ? 'Tasdiqlandi — ishlab chiqarishga o\'tdi' : 'Dizaynga qaytarildi'); refresh(); },
    onError: toast.error,
  });

  const requestChanges = (id: string) => {
    const comment = window.prompt('Mijoz nimani o\'zgartirishni so\'radi?');
    if (comment?.trim()) decide.mutate({ id, decision: 'REQUEST_CHANGES', comment });
  };

  if (!order.needsDesign && order.designVersions.length === 0) return null;

  return (
    <Card
      title="Dizayn variantlari"
      description={order.revisionCount ? `Qayta ishlashlar: ${order.revisionCount}` : undefined}
      actions={canUpload ? <Button size="sm" onClick={() => setUploading(true)}><Upload className="h-4 w-4" />Yuklash</Button> : undefined}
    >
      {order.designVersions.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          {order.designerId ? 'Hali variant yuklanmagan' : 'Dizayner tayinlanmagan'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {order.designVersions.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-xl border border-gray-100">
              <a href={fileUrl(v.previewUrl)} target="_blank" rel="noreferrer" className="block aspect-video bg-gray-50">
                <img src={fileUrl(v.previewUrl)} alt={`Dizayn v${v.version}`} className="h-full w-full object-contain" />
              </a>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">v{v.version} · {v.areaM2} m²</span>
                  <Badge variant={DESIGN_VARIANT[v.status]}>{DESIGN_STATUS_LABELS[v.status]}</Badge>
                </div>
                <p className="text-xs text-gray-400">{v.designer?.fullName} · {formatDateTime(v.createdAt)}</p>
                {v.clientComment && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Mijoz: “{v.clientComment}”</p>}
                <div className="flex flex-wrap gap-2">
                  <a href={fileUrl(v.fileUrl)} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Download className="h-3 w-3" /></Button></a>
                  {v.status === 'DRAFT' && canUpload && (
                    <Button size="sm" isLoading={send.isPending} onClick={() => send.mutate(v.id)}><Send className="h-3 w-3" />Mijozga yuborish</Button>
                  )}
                  {v.status === 'SENT' && (
                    <Button size="sm" variant="outline" onClick={() => getShare.mutate(v.id)}><Share2 className="h-3 w-3" />Havola</Button>
                  )}
                  {v.status === 'SENT' && isFinance(user.role) && (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decide.mutate({ id: v.id, decision: 'APPROVE' })}>
                        <Check className="h-3 w-3" />Tasdiqladi
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => requestChanges(v.id)}><X className="h-3 w-3" />O'zgartirish</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <DesignUploadModal open={uploading} onClose={() => setUploading(false)} orderId={order.id} orderNumber={order.number} defaultAreaM2={order.totalAreaM2} />
      <ShareModal info={share} onClose={() => setShare(null)} />
    </Card>
  );
}
